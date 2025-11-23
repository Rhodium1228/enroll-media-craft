-- Tighten RLS policy for branches to restrict SELECT to creators only
-- Drop the overly permissive "Admin users can view all branches" policy
DROP POLICY IF EXISTS "Admin users can view all branches" ON public.branches;

-- Create new policy that restricts SELECT to branch creators only
CREATE POLICY "Admins can view their branches"
ON public.branches
FOR SELECT
TO authenticated
USING (auth.uid() = created_by);