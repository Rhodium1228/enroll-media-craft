-- Fix branches table: Make created_by NOT NULL
-- This ensures RLS policies always work correctly
ALTER TABLE public.branches 
ALTER COLUMN created_by SET NOT NULL;