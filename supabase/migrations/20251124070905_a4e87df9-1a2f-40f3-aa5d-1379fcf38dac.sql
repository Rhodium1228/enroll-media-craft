-- Create staff clock records table
CREATE TABLE IF NOT EXISTS public.staff_clock_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  clock_in_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  clock_out_time TIMESTAMP WITH TIME ZONE,
  clock_in_latitude DECIMAL(10, 8),
  clock_in_longitude DECIMAL(11, 8),
  clock_out_latitude DECIMAL(10, 8),
  clock_out_longitude DECIMAL(11, 8),
  status TEXT NOT NULL DEFAULT 'clocked_in' CHECK (status IN ('clocked_in', 'clocked_out')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.staff_clock_records ENABLE ROW LEVEL SECURITY;

-- Admins can view clock records for their staff
CREATE POLICY "Admins can view clock records for their staff"
ON public.staff_clock_records
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.id = staff_clock_records.staff_id
    AND s.created_by = auth.uid()
  )
);

-- Admins can create clock records for their staff
CREATE POLICY "Admins can create clock records for their staff"
ON public.staff_clock_records
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.id = staff_clock_records.staff_id
    AND s.created_by = auth.uid()
  )
);

-- Admins can update clock records for their staff
CREATE POLICY "Admins can update clock records for their staff"
ON public.staff_clock_records
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.id = staff_clock_records.staff_id
    AND s.created_by = auth.uid()
  )
);

-- Admins can delete clock records for their staff
CREATE POLICY "Admins can delete clock records for their staff"
ON public.staff_clock_records
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.id = staff_clock_records.staff_id
    AND s.created_by = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_staff_clock_records_updated_at
BEFORE UPDATE ON public.staff_clock_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_staff_clock_records_staff_id ON public.staff_clock_records(staff_id);
CREATE INDEX idx_staff_clock_records_branch_id ON public.staff_clock_records(branch_id);
CREATE INDEX idx_staff_clock_records_clock_in_time ON public.staff_clock_records(clock_in_time DESC);