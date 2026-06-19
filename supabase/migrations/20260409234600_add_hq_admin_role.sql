-- =============================================================================
-- Migration: add_hq_admin_role
-- Purpose  : Add the 'hq_admin' value to the app_role enum.
--
-- IMPORTANT (Postgres caveat):
--   A newly added enum value cannot be USED (compared, inserted) inside the
--   same transaction that ADDs it.  Supabase wraps each migration file in a
--   single transaction.  Therefore this ADD VALUE must live in its own file
--   (this one) and the policies that reference 'hq_admin' must be in a
--   SEPARATE, later migration file (20260409234700_center_walls.sql).
--
-- Apply order: run this file BEFORE 20260409234700_center_walls.sql.
-- =============================================================================

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'hq_admin';
