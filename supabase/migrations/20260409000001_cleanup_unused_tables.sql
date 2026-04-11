-- Migration: Clean up unused/unnecessary tables
-- Purpose: Remove tables that were created but never implemented or are bad practice

-- ============================================================================
-- DROP UNUSED TABLES
-- ============================================================================

-- 1. sms_confirmations - Feature never implemented
DROP TABLE IF EXISTS sms_confirmations CASCADE;

-- 2. code_backups - Bad practice (code belongs in Git, not database)
DROP TABLE IF EXISTS code_backups CASCADE;

-- 3. resend_api_keys - Security risk (API keys belong in .env, not database)
DROP TABLE IF EXISTS resend_api_keys CASCADE;

-- 4. rate_adjustments - Redundant (rates stored in JSONB columns on contractors/drivers)
DROP TABLE IF EXISTS rate_adjustments CASCADE;

-- ============================================================================
-- CLEANUP COMPLETE
-- ============================================================================

-- Tables dropped: 4
-- Reason: Never implemented or bad practice
-- Impact: None - these tables were not actively used by the application
