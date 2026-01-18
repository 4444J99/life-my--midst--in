-- Performance optimization indexes for In Midst My Life

-- Profiles table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_created_at ON profiles(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_updated_at ON profiles(updated_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_email ON profiles(email) WHERE email IS NOT NULL;

-- Masks table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_masks_profile_id ON masks(profile_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_masks_epoch_id ON masks(epoch_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_masks_stage_id ON masks(stage_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_masks_created_at ON masks(created_at DESC);

-- Curriculum Vitae indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cv_profile_id ON curriculum_vitae(profile_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cv_mask_id ON curriculum_vitae(mask_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cv_created_at ON curriculum_vitae(created_at DESC);

-- Narratives indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_narratives_profile_id ON narratives(profile_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_narratives_mask_id ON narratives(mask_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_narratives_created_at ON narratives(created_at DESC);

-- Job applications indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_applications_profile_id ON job_applications(profile_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_applications_status ON job_applications(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_applications_created_at ON job_applications(created_at DESC);

-- Subscriptions indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_profile_id ON subscriptions(profile_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_tier ON subscriptions(tier);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- Rate limits indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rate_limits_profile_id ON rate_limits(profile_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rate_limits_endpoint ON rate_limits(endpoint);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rate_limits_window_start ON rate_limits(window_start DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rate_limits_composite ON rate_limits(profile_id, endpoint, window_start);

-- Attestation blocks indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attestation_blocks_profile_id ON attestation_blocks(profile_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attestation_blocks_created_at ON attestation_blocks(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attestation_blocks_hash ON attestation_blocks(block_hash);

-- Analyze tables for query planner
ANALYZE profiles;
ANALYZE masks;
ANALYZE curriculum_vitae;
ANALYZE narratives;
ANALYZE job_applications;
ANALYZE subscriptions;
ANALYZE rate_limits;
ANALYZE attestation_blocks;
