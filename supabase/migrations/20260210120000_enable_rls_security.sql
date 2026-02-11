-- ============================================
-- RLS SECURITY IMPLEMENTATION FOR 3DP-QUOTE
-- ============================================
-- Migration: Enable Row Level Security on all public tables
-- Date: 2026-02-10
-- Purpose: Fix security vulnerabilities by implementing proper RLS policies
--
-- Security Model:
-- - All tables protected by RLS
-- - Service role (backend) has full access
-- - Anonymous users can only INSERT quotes, file uploads, and mailing list subscriptions
-- - No direct public database reads
-- - All data access must go through authenticated backend APIs
-- ============================================

-- ============================================
-- PHASE 1: ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public."Quote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Material" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PricingRule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."EmailVerification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."VerificationAttempt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."UserSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."MailingListSubscriber" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."FileUpload" ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PHASE 2: DROP EXISTING POLICIES (IF ANY)
-- ============================================
-- This ensures clean slate if migration is re-run

DO $$
BEGIN
    -- Drop policies for Quote table
    DROP POLICY IF EXISTS "Anyone can create quotes" ON public."Quote";
    DROP POLICY IF EXISTS "Only service role can read quotes" ON public."Quote";
    DROP POLICY IF EXISTS "Only service role can update quotes" ON public."Quote";
    DROP POLICY IF EXISTS "Only service role can delete quotes" ON public."Quote";

    -- Drop policies for Material table
    DROP POLICY IF EXISTS "Only service role can read materials" ON public."Material";
    DROP POLICY IF EXISTS "Only service role can modify materials" ON public."Material";

    -- Drop policies for PricingRule table
    DROP POLICY IF EXISTS "Only service role can read pricing rules" ON public."PricingRule";
    DROP POLICY IF EXISTS "Only service role can modify pricing rules" ON public."PricingRule";

    -- Drop policies for EmailVerification table
    DROP POLICY IF EXISTS "Only service role can access email verifications" ON public."EmailVerification";

    -- Drop policies for VerificationAttempt table
    DROP POLICY IF EXISTS "Only service role can access verification attempts" ON public."VerificationAttempt";

    -- Drop policies for UserSession table
    DROP POLICY IF EXISTS "Only service role can access user sessions" ON public."UserSession";

    -- Drop policies for MailingListSubscriber table
    DROP POLICY IF EXISTS "Anyone can subscribe to mailing list" ON public."MailingListSubscriber";
    DROP POLICY IF EXISTS "Only service role can read subscribers" ON public."MailingListSubscriber";
    DROP POLICY IF EXISTS "Only service role can update subscribers" ON public."MailingListSubscriber";
    DROP POLICY IF EXISTS "Only service role can delete subscribers" ON public."MailingListSubscriber";

    -- Drop policies for FileUpload table
    DROP POLICY IF EXISTS "Anyone can create file uploads" ON public."FileUpload";
    DROP POLICY IF EXISTS "Only service role can read file uploads" ON public."FileUpload";
    DROP POLICY IF EXISTS "Only service role can update file uploads" ON public."FileUpload";
    DROP POLICY IF EXISTS "Only service role can delete file uploads" ON public."FileUpload";
END $$;

-- ============================================
-- PHASE 3: CREATE RESTRICTIVE POLICIES
-- ============================================

-- ----------------
-- Material Table
-- Backend calculator code only (service role)
-- ----------------
CREATE POLICY "Only service role can read materials"
  ON public."Material"
  FOR SELECT
  USING (auth.role() = 'service_role');

CREATE POLICY "Only service role can modify materials"
  ON public."Material"
  FOR ALL
  USING (auth.role() = 'service_role');

-- ----------------
-- PricingRule Table
-- Backend calculator code only (service role)
-- ----------------
CREATE POLICY "Only service role can read pricing rules"
  ON public."PricingRule"
  FOR SELECT
  USING (auth.role() = 'service_role');

CREATE POLICY "Only service role can modify pricing rules"
  ON public."PricingRule"
  FOR ALL
  USING (auth.role() = 'service_role');

-- ----------------
-- Quote Table
-- Anonymous INSERT allowed (quote requests)
-- All other operations require service role
-- ----------------
CREATE POLICY "Anyone can create quotes"
  ON public."Quote"
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Only service role can read quotes"
  ON public."Quote"
  FOR SELECT
  USING (auth.role() = 'service_role');

CREATE POLICY "Only service role can update quotes"
  ON public."Quote"
  FOR UPDATE
  USING (auth.role() = 'service_role');

CREATE POLICY "Only service role can delete quotes"
  ON public."Quote"
  FOR DELETE
  USING (auth.role() = 'service_role');

-- ----------------
-- EmailVerification Table
-- CRITICAL: Service role only
-- Contains verification codes/tokens
-- ----------------
CREATE POLICY "Only service role can access email verifications"
  ON public."EmailVerification"
  FOR ALL
  USING (auth.role() = 'service_role');

-- ----------------
-- VerificationAttempt Table
-- CRITICAL: Service role only
-- Security logging and rate limiting
-- ----------------
CREATE POLICY "Only service role can access verification attempts"
  ON public."VerificationAttempt"
  FOR ALL
  USING (auth.role() = 'service_role');

-- ----------------
-- UserSession Table
-- CRITICAL: Service role only
-- Contains session tokens
-- ----------------
CREATE POLICY "Only service role can access user sessions"
  ON public."UserSession"
  FOR ALL
  USING (auth.role() = 'service_role');

-- ----------------
-- MailingListSubscriber Table
-- Anonymous INSERT allowed (subscriptions)
-- All other operations require service role
-- ----------------
CREATE POLICY "Anyone can subscribe to mailing list"
  ON public."MailingListSubscriber"
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Only service role can read subscribers"
  ON public."MailingListSubscriber"
  FOR SELECT
  USING (auth.role() = 'service_role');

CREATE POLICY "Only service role can update subscribers"
  ON public."MailingListSubscriber"
  FOR UPDATE
  USING (auth.role() = 'service_role');

CREATE POLICY "Only service role can delete subscribers"
  ON public."MailingListSubscriber"
  FOR DELETE
  USING (auth.role() = 'service_role');

-- ----------------
-- FileUpload Table
-- Anonymous INSERT allowed (STL uploads)
-- All other operations require service role
-- ----------------
CREATE POLICY "Anyone can create file uploads"
  ON public."FileUpload"
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Only service role can read file uploads"
  ON public."FileUpload"
  FOR SELECT
  USING (auth.role() = 'service_role');

CREATE POLICY "Only service role can update file uploads"
  ON public."FileUpload"
  FOR UPDATE
  USING (auth.role() = 'service_role');

CREATE POLICY "Only service role can delete file uploads"
  ON public."FileUpload"
  FOR DELETE
  USING (auth.role() = 'service_role');

-- ============================================
-- PHASE 4: VERIFICATION QUERIES
-- ============================================
-- These queries can be run separately to verify the migration

-- Check that RLS is enabled on all tables
DO $$
DECLARE
    table_record RECORD;
    rls_status TEXT;
BEGIN
    RAISE NOTICE '=== RLS Status Verification ===';
    FOR table_record IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename IN (
            'Quote', 'Material', 'PricingRule', 'EmailVerification',
            'VerificationAttempt', 'UserSession', 'MailingListSubscriber', 'FileUpload'
        )
    LOOP
        SELECT CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END
        INTO rls_status
        FROM pg_class
        WHERE relname = table_record.tablename
        AND relnamespace = 'public'::regnamespace;

        RAISE NOTICE 'Table: % - RLS: %', table_record.tablename, rls_status;
    END LOOP;
END $$;

-- Count policies per table
DO $$
DECLARE
    table_record RECORD;
    policy_count INTEGER;
BEGIN
    RAISE NOTICE '=== Policy Count Verification ===';
    FOR table_record IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename IN (
            'Quote', 'Material', 'PricingRule', 'EmailVerification',
            'VerificationAttempt', 'UserSession', 'MailingListSubscriber', 'FileUpload'
        )
    LOOP
        SELECT COUNT(*)
        INTO policy_count
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = table_record.tablename;

        RAISE NOTICE 'Table: % - Policies: %', table_record.tablename, policy_count;
    END LOOP;
END $$;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- Next Steps:
-- 1. Verify all backend API calls use service_role key for database access
-- 2. Ensure frontend quote calculator calls backend API (not direct DB)
-- 3. Test anonymous quote submission still works
-- 4. Test file upload functionality
-- 5. Test mailing list subscription
-- 6. Run Supabase linter again to verify no security errors
-- ============================================
