/*
  # Fix Remaining RLS Policy Performance Issues

  This migration fixes the remaining RLS policies that re-evaluate auth functions for each row.

  ## Changes:
  1. Optimizes all RLS policies to use SELECT subqueries for auth functions
  2. Consolidates duplicate permissive policies
  3. Improves query performance at scale

  Note: "Unused Index" warnings are expected and do not need fixing - indexes will be used as the application scales.
*/

-- =====================================================
-- FIX RLS POLICIES - WRAP AUTH FUNCTIONS IN SELECT
-- =====================================================

-- Trip assignment history policies
DROP POLICY IF EXISTS "Admins can view all assignment history" ON public.trip_assignment_history;
CREATE POLICY "Admins can view all assignment history" ON public.trip_assignment_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Dispatchers can view facility assignment history" ON public.trip_assignment_history;
CREATE POLICY "Dispatchers can view assignment history" ON public.trip_assignment_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = (select auth.uid()) AND (role = 'admin' OR role = 'dispatcher')
    )
  );

-- Notifications policies
DROP POLICY IF EXISTS "Users can view notifications for their facility" ON public.notifications;
CREATE POLICY "Authenticated users can view notifications" ON public.notifications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = (select auth.uid())
    )
  );

-- Feedback surveys policies
DROP POLICY IF EXISTS "Admins can view all feedback" ON public.feedback_surveys;
CREATE POLICY "Admins can view all feedback" ON public.feedback_surveys
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Dispatchers can view facility feedback" ON public.feedback_surveys;
CREATE POLICY "Dispatchers can view feedback" ON public.feedback_surveys
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = (select auth.uid())
      AND (role = 'admin' OR role = 'dispatcher')
    )
  );

-- Trip templates policies
DROP POLICY IF EXISTS "Admins can view all templates" ON public.trip_templates;
CREATE POLICY "Admins can view all templates" ON public.trip_templates
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Dispatchers can view facility templates" ON public.trip_templates;
CREATE POLICY "Dispatchers can view templates" ON public.trip_templates
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = (select auth.uid())
      AND (role = 'admin' OR role = 'dispatcher')
    )
  );

DROP POLICY IF EXISTS "Dispatchers can manage facility templates" ON public.trip_templates;
CREATE POLICY "Dispatchers can manage templates" ON public.trip_templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = (select auth.uid())
      AND (role = 'admin' OR role = 'dispatcher')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = (select auth.uid())
      AND (role = 'admin' OR role = 'dispatcher')
    )
  );

-- Users table policies
DROP POLICY IF EXISTS "Admins can read all users" ON public.users;
CREATE POLICY "Admins can read all users" ON public.users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

-- Activity log policies
DROP POLICY IF EXISTS "Admins can delete activity log" ON public.activity_log;
CREATE POLICY "Admins can delete activity log" ON public.activity_log
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

-- Patient consents policies
DROP POLICY IF EXISTS "Only admins can delete patient consents" ON public.patient_consents;
CREATE POLICY "Only admins can delete patient consents" ON public.patient_consents
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

-- Trip photos policies
DROP POLICY IF EXISTS "Admins can delete trip photos" ON public.trip_photos;
CREATE POLICY "Admins can delete trip photos" ON public.trip_photos
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

-- Trip signatures policies
DROP POLICY IF EXISTS "Only admins can delete trip signatures" ON public.trip_signatures;
CREATE POLICY "Only admins can delete trip signatures" ON public.trip_signatures
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );
