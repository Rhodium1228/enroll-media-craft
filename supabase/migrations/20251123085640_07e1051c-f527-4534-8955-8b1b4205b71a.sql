-- Create appointments table
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for appointments
CREATE POLICY "Admins can create appointments for their branches"
ON public.appointments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.branches b
    WHERE b.id = appointments.branch_id
    AND b.created_by = auth.uid()
  )
);

CREATE POLICY "Admins can view appointments for their branches"
ON public.appointments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.branches b
    WHERE b.id = appointments.branch_id
    AND b.created_by = auth.uid()
  )
);

CREATE POLICY "Admins can update appointments for their branches"
ON public.appointments
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.branches b
    WHERE b.id = appointments.branch_id
    AND b.created_by = auth.uid()
  )
);

CREATE POLICY "Admins can delete appointments for their branches"
ON public.appointments
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.branches b
    WHERE b.id = appointments.branch_id
    AND b.created_by = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_appointments_updated_at
BEFORE UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for appointments
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;

-- Create index for faster queries
CREATE INDEX idx_appointments_staff_date ON public.appointments(staff_id, date);
CREATE INDEX idx_appointments_branch_date ON public.appointments(branch_id, date);
CREATE INDEX idx_appointments_date ON public.appointments(date);