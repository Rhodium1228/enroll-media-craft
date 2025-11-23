-- Create branch_schedule_overrides table for date-specific operating hours
CREATE TABLE public.branch_schedule_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  override_type TEXT NOT NULL CHECK (override_type IN ('open', 'closed', 'custom_hours')),
  time_slots JSONB DEFAULT '[]'::jsonb,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_branch_date UNIQUE (branch_id, date)
);

-- Create indexes for performance
CREATE INDEX idx_branch_overrides_branch_date ON public.branch_schedule_overrides(branch_id, date);
CREATE INDEX idx_branch_overrides_date ON public.branch_schedule_overrides(date);

-- Enable Row Level Security
ALTER TABLE public.branch_schedule_overrides ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can view branch overrides"
  ON public.branch_schedule_overrides FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.branches b 
      WHERE b.id = branch_schedule_overrides.branch_id 
      AND b.created_by = auth.uid()
    )
  );

CREATE POLICY "Admins can create branch overrides"
  ON public.branch_schedule_overrides FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.branches b 
      WHERE b.id = branch_schedule_overrides.branch_id 
      AND b.created_by = auth.uid()
    )
  );

CREATE POLICY "Admins can update branch overrides"
  ON public.branch_schedule_overrides FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.branches b 
      WHERE b.id = branch_schedule_overrides.branch_id 
      AND b.created_by = auth.uid()
    )
  );

CREATE POLICY "Admins can delete branch overrides"
  ON public.branch_schedule_overrides FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.branches b 
      WHERE b.id = branch_schedule_overrides.branch_id 
      AND b.created_by = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_branch_schedule_overrides_updated_at
  BEFORE UPDATE ON public.branch_schedule_overrides
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();