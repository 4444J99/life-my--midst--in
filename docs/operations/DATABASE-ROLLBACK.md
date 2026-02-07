# Database Rollback Procedures

Safe procedures for rolling back database migrations in emergency situations.

## Quick Rollback

```bash
# Rollback last migration
./scripts/rollback-migration.sh latest

# Rollback to specific version
./scripts/rollback-migration.sh 011_subscriptions

# Verify state
psql $DATABASE_URL -c "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 5;"
```

## Migration History

Current migrations:
- `001_initial_schema.sql`         - Core tables (profiles, epochs, stages, etc.)
- `002_identity_and_masks.sql`     - Identity & mask system
- `003_narratives.sql`             - Narrative storage
- `004_verifications.sql`          - Verification/VC system
- `010_rate_limits.sql`            - Billing quota enforcement
- `011_subscriptions.sql`          - Stripe subscriptions
- `012_stripe_events.sql`          - Webhook idempotency

## Rollback Scripts

Each migration has corresponding rollback:
```
apps/api/migrations/rollback/
├── 001_initial_schema.sql
├── 002_identity_and_masks.sql
├── 003_narratives.sql
├── 004_verifications.sql
├── 010_rate_limits.sql
├── 011_subscriptions.sql
└── 012_stripe_events.sql
```

## Procedure

1. **Identify problematic migration:**
   ```bash
   psql $DATABASE_URL -c "\d schema_migrations;"
   # Find migration causing issues
   ```
2. **Create backup (CRITICAL):**
   ```bash
   pg_dump $DATABASE_URL > /tmp/backup_before_rollback.sql
   # Test restore on separate DB: psql $TEST_DB < /tmp/backup_before_rollback.sql
   ```
3. **Execute rollback:**
   ```bash
   psql $DATABASE_URL -f apps/api/migrations/rollback/011_subscriptions.sql
   # Update tracking table
   psql $DATABASE_URL -c "DELETE FROM schema_migrations WHERE version = '011';"
   ```
4. **Verify state:**
   ```bash
   psql $DATABASE_URL -c "SELECT * FROM schema_migrations;"
   # Check application still works: curl $API_BASE_URL/health
   ```
5. **If restore needed:**
   ```bash
   # Stop API servers
   docker-compose stop api orchestrator

   # Restore from backup
   psql $DATABASE_URL < /tmp/backup_before_rollback.sql

   # Restart
   docker-compose up api orchestrator
   ```

## Prevention

- Always test migrations on staging first
- Run backups before applying to production
- Keep rollback scripts in sync with migrations
- Test rollback procedure monthly
