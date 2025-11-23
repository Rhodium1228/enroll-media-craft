-- Create staff_date_assignments table for one-time date-specific staff assignments
CREATE TABLE public.staff_date_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES public.staff(id) ON DELETE CASCADE NOT NULL,
  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  time_slots jsonb NOT NULL DEFAULT '[]'::jsonb,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(staff_id, branch_id, date)
);

-- Enable RLS
ALTER TABLE public.staff_date_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for staff_date_assignments
CREATE POLICY "Admins can create date assignments"
ON public.staff_date_assignments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.branches
    WHERE branches.id = staff_date_assignments.branch_id
    AND branches.created_by = auth.uid()
  )
);

CREATE POLICY "Admins can view date assignments"
ON public.staff_date_assignments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.branches
    WHERE branches.id = staff_date_assignments.branch_id
    AND branches.created_by = auth.uid()
  )
);

CREATE POLICY "Admins can update date assignments"
ON public.staff_date_assignments
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.branches
    WHERE branches.id = staff_date_assignments.branch_id
    AND branches.created_by = auth.uid()
  )
);

CREATE POLICY "Admins can delete date assignments"
ON public.staff_date_assignments
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.branches
    WHERE branches.id = staff_date_assignments.branch_id
    AND branches.created_by = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_staff_date_assignments_updated_at
BEFORE UPDATE ON public.staff_date_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();