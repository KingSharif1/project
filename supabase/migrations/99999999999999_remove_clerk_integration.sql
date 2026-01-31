-- ============================================
-- Remove Clerk Integration - Use Supabase Auth Only
-- ============================================
-- This migration removes the clerk_user_id NOT NULL constraint
-- since we're now using Supabase authentication exclusively

-- Make clerk_user_id nullable (for backward compatibility)
ALTER TABLE public.users ALTER COLUMN clerk_user_id DROP NOT NULL;

-- Optionally, you can drop the column entirely if you don't need it:
-- ALTER TABLE public.users DROP COLUMN clerk_user_id;

-- Add comment to document the change
COMMENT ON COLUMN public.users.clerk_user_id IS 'DEPRECATED: Legacy Clerk integration field, now nullable. Use Supabase auth.users instead.';
