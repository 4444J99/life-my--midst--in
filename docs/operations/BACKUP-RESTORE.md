# Backup & Restore Strategy

## PostgreSQL

### Automated Backups

Use `scripts/backup-db.sh` for on-demand or cron-scheduled backups:

```bash
# Local backup (saves to ./backups/)
./scripts/backup-db.sh

# Production backup with S3 archiving
PGHOST=prod-db.example.com \
PGUSER=inmidst \
PGDATABASE=midst_prod \
S3_BUCKET=inmidst-backups \
  ./scripts/backup-db.sh
```

### Cron Schedule (recommended)

```cron
# Daily at 02:00 UTC
0 2 * * * cd /opt/inmidst && ./scripts/backup-db.sh >> /var/log/inmidst-backup.log 2>&1
```

### Manual Restore

```bash
# Decompress and restore
gunzip -c backups/midst_prod_20260206_020000.sql.gz | psql midst_prod

# From S3
aws s3 cp s3://inmidst-backups/backups/midst_prod/midst_prod_20260206_020000.sql.gz - \
  | gunzip | psql midst_prod
```

### Point-in-Time Recovery (Production)

For production environments, enable WAL archiving in PostgreSQL:

```ini
# postgresql.conf
wal_level = replica
archive_mode = on
archive_command = 'aws s3 cp %p s3://inmidst-backups/wal/%f'
```

Restore to a specific point:

```bash
# 1. Stop PostgreSQL
# 2. Restore base backup
# 3. Create recovery.signal and set recovery_target_time in postgresql.conf
# 4. Start PostgreSQL — it replays WAL to the target time
```

## Redis

Redis is used as a cache and task queue. Data loss is tolerable — the system recovers gracefully:

- **Cache entries** are regenerated on miss
- **Task queue** items are re-enqueued by the orchestrator's scheduler

For environments that need Redis persistence:

```bash
# Trigger RDB snapshot
redis-cli BGSAVE

# Copy dump.rdb
cp /var/lib/redis/dump.rdb backups/redis_$(date +%Y%m%d_%H%M%S).rdb
```

## Retention Policy

| Environment | Frequency | Local Retention | S3 Retention |
|-------------|-----------|-----------------|--------------|
| Development | Manual    | 7 days          | N/A          |
| Staging     | Daily     | 7 days          | 30 days      |
| Production  | Daily     | 7 days          | 90 days      |

## Verification

Periodically test restores to ensure backup integrity:

```bash
# Create a test database and restore into it
createdb midst_restore_test
gunzip -c backups/midst_prod_latest.sql.gz | psql midst_restore_test

# Verify row counts
psql midst_restore_test -c "SELECT 'profiles' AS t, count(*) FROM profiles UNION ALL SELECT 'masks', count(*) FROM masks;"

# Clean up
dropdb midst_restore_test
```
