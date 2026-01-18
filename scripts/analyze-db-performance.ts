#!/usr/bin/env tsx

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env['DATABASE_URL'] || process.env['POSTGRES_URL'],
});

interface QueryStats {
  query: string;
  calls: number;
  total_time: number;
  mean_time: number;
  min_time: number;
  max_time: number;
}

interface IndexStats {
  schemaname: string;
  tablename: string;
  indexname: string;
  idx_scan: number;
  idx_tup_read: number;
  idx_tup_fetch: number;
}

interface TableStats {
  schemaname: string;
  tablename: string;
  seq_scan: number;
  seq_tup_read: number;
  idx_scan: number;
  idx_tup_fetch: number;
  n_tup_ins: number;
  n_tup_upd: number;
  n_tup_del: number;
}

async function analyzePerformance() {
  console.log('🔍 Database Performance Analysis\n');

  try {
    console.log('📊 Top 10 Slowest Queries:');
    console.log('─'.repeat(80));
    
    const slowQueries = await pool.query<QueryStats>(`
      SELECT 
        substring(query, 1, 60) as query,
        calls,
        total_exec_time as total_time,
        mean_exec_time as mean_time,
        min_exec_time as min_time,
        max_exec_time as max_time
      FROM pg_stat_statements
      WHERE query NOT LIKE '%pg_stat_statements%'
      ORDER BY mean_exec_time DESC
      LIMIT 10
    `);
    
    if (slowQueries.rows.length > 0) {
      slowQueries.rows.forEach((row, i) => {
        console.log(`${i + 1}. ${row.query}`);
        console.log(`   Calls: ${row.calls} | Avg: ${row.mean_time.toFixed(2)}ms | Max: ${row.max_time.toFixed(2)}ms\n`);
      });
    } else {
      console.log('   No query statistics available. Enable pg_stat_statements extension.\n');
    }

    console.log('\n📈 Index Usage Statistics:');
    console.log('─'.repeat(80));
    
    const indexUsage = await pool.query<IndexStats>(`
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_scan,
        idx_tup_read,
        idx_tup_fetch
      FROM pg_stat_user_indexes
      WHERE schemaname = 'public'
      ORDER BY idx_scan DESC
      LIMIT 15
    `);
    
    indexUsage.rows.forEach(row => {
      console.log(`${row.tablename}.${row.indexname}`);
      console.log(`   Scans: ${row.idx_scan} | Rows Read: ${row.idx_tup_read} | Rows Fetched: ${row.idx_tup_fetch}\n`);
    });

    console.log('\n🔍 Unused Indexes (candidates for removal):');
    console.log('─'.repeat(80));
    
    const unusedIndexes = await pool.query<IndexStats>(`
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_scan
      FROM pg_stat_user_indexes
      WHERE schemaname = 'public'
        AND idx_scan = 0
        AND indexname NOT LIKE '%_pkey'
      ORDER BY tablename, indexname
    `);
    
    if (unusedIndexes.rows.length > 0) {
      unusedIndexes.rows.forEach(row => {
        console.log(`⚠️  ${row.tablename}.${row.indexname} (0 scans)`);
      });
      console.log('');
    } else {
      console.log('   ✅ All indexes are being used\n');
    }

    console.log('\n📋 Table Statistics:');
    console.log('─'.repeat(80));
    
    const tableStats = await pool.query<TableStats>(`
      SELECT 
        schemaname,
        tablename,
        seq_scan,
        seq_tup_read,
        idx_scan,
        idx_tup_fetch,
        n_tup_ins,
        n_tup_upd,
        n_tup_del
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      ORDER BY seq_scan DESC
      LIMIT 15
    `);
    
    tableStats.rows.forEach(row => {
      const indexRatio = row.idx_scan > 0 
        ? ((row.idx_scan / (row.seq_scan + row.idx_scan)) * 100).toFixed(1)
        : '0.0';
      
      console.log(`${row.tablename}`);
      console.log(`   Seq Scans: ${row.seq_scan} (${row.seq_tup_read} rows) | Index Scans: ${row.idx_scan} (${row.idx_tup_fetch} rows)`);
      console.log(`   Index Ratio: ${indexRatio}% | Inserts: ${row.n_tup_ins} | Updates: ${row.n_tup_upd} | Deletes: ${row.n_tup_del}`);
      
      if (row.seq_scan > 1000 && parseFloat(indexRatio) < 50) {
        console.log(`   ⚠️  High sequential scan count with low index usage - consider adding indexes`);
      }
      console.log('');
    });

    console.log('\n💾 Cache Hit Ratio:');
    console.log('─'.repeat(80));
    
    const cacheHitRatio = await pool.query(`
      SELECT 
        sum(heap_blks_read) as heap_read,
        sum(heap_blks_hit)  as heap_hit,
        sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) * 100 as ratio
      FROM pg_statio_user_tables
    `);
    
    const ratio = cacheHitRatio.rows[0].ratio;
    console.log(`Cache Hit Ratio: ${ratio ? ratio.toFixed(2) : 'N/A'}%`);
    
    if (ratio && ratio < 90) {
      console.log('⚠️  Cache hit ratio is below 90% - consider increasing shared_buffers');
    } else if (ratio) {
      console.log('✅ Good cache hit ratio');
    }

    console.log('\n\n💡 Recommendations:');
    console.log('─'.repeat(80));
    console.log('1. Run EXPLAIN ANALYZE on slow queries to identify optimization opportunities');
    console.log('2. Consider partitioning large tables (>10M rows) by date or ID ranges');
    console.log('3. Review and potentially remove unused indexes to reduce write overhead');
    console.log('4. Ensure pg_stat_statements is enabled for detailed query analysis');
    console.log('5. Monitor cache hit ratios and adjust shared_buffers if needed');
    console.log('6. Use connection pooling (PgBouncer) for high-concurrency workloads\n');

  } catch (error) {
    console.error('Error analyzing database:', error);
    if ((error as any).message?.includes('pg_stat_statements')) {
      console.log('\n⚠️  pg_stat_statements extension not available.');
      console.log('Enable it with: CREATE EXTENSION IF NOT EXISTS pg_stat_statements;\n');
    }
  } finally {
    await pool.end();
  }
}

analyzePerformance().catch(console.error);
