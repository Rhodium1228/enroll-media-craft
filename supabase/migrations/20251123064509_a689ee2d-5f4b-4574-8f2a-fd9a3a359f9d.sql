-- Create enum for override types
CREATE TYPE public.override_type AS ENUM ('available', 'unavailable', 'custom_hours');

-- Create enum for leave status
CREATE TYPE public.leave_status AS ENUM ('pending', 'approved', 'rejected');

-- Create enum for leave type
CREATE TYPE public.leave_type AS ENUM ('vacation', 'sick', 'personal', 'other');

-- Create staff_schedule_overrides table for date-specific scheduling
CREATE TABLE public.staff_schedule_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  override_type public.override_type NOT NULL,
  time_slots JSONB DEFAULT '[]'::jsonb,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(staff_id, branch_id, date)
);

-- Create staff_leave_requests table for time-off management
CREATE TABLE public.staff_leave_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  leave_type public.leave_type NOT NULL,
  status public.leave_status NOT NULL DEFAULT 'pending',
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Enable RLS
ALTER TABLE public.staff_schedule_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_leave_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for staff_schedule_overrides
CREATE POLICY "Admins can view schedule overrides"
ON public.staff_schedule_overrides
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.branches b
    WHERE b.id = staff_schedule_overrides.branch_id
    AND b.created_by = auth.uid()
  )
);

CREATE POLICY "Admins can create schedule overrides"
ON public.staff_schedule_overrides
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.branches b
    WHERE b.id = staff_schedule_overrides.branch_id
    AND b.created_by = auth.uid()
  )
);

CREATE POLICY "Admins can update schedule overrides"
ON public.staff_schedule_overrides
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.branches b
    WHERE b.id = staff_schedule_overrides.branch_id
    AND b.created_by = auth.uid()
  )
);

CREATE POLICY "Admins can delete schedule overrides"
ON public.staff_schedule_overrides
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.branches b
    WHERE b.id = staff_schedule_overrides.branch_id
    AND b.created_by = auth.uid()
  )
);

-- RLS Policies for staff_leave_requests
CREATE POLICY "Admins can view leave requests"
ON public.staff_leave_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.id = staff_leave_requests.staff_id
    AND s.created_by = auth.uid()
  )
);

CREATE POLICY "Admins can create leave requests"
ON public.staff_leave_requests
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.id = staff_leave_requests.staff_id
    AND s.created_by = auth.uid()
  )
);

CREATE POLICY "Admins can update leave requests"
ON public.staff_leave_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.id = staff_leave_requests.staff_id
    AND s.created_by = auth.uid()
  )
);

CREATE POLICY "Admins can delete leave requests"
ON public.staff_leave_requests
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.id = staff_leave_requests.staff_id
    AND s.created_by = auth.uid()
  )
);

-- Create triggers for updated_at
CREATE TRIGGER update_staff_schedule_overrides_updated_at
BEFORE UPDATE ON public.staff_schedule_overrides
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_staff_leave_requests_updated_at
BEFORE UPDATE ON public.staff_leave_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_staff_schedule_overrides_staff_date ON public.staff_schedule_overrides(staff_id, date);
CREATE INDEX idx_staff_schedule_overrides_branch_date ON public.staff_schedule_overrides(branch_id, date);
CREATE INDEX idx_staff_leave_requests_staff_dates ON public.staff_leave_requests(staff_id, start_date, end_date);
CREATE INDEX idx_staff_leave_requests_date_range ON public.staff_leave_requests(start_date, end_date);