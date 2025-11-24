-- Create notifications table for admin alerts
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can view their notifications"
ON public.admin_notifications
FOR SELECT
USING (auth.uid() = admin_id);

CREATE POLICY "Admins can update their notifications"
ON public.admin_notifications
FOR UPDATE
USING (auth.uid() = admin_id);

CREATE POLICY "System can create notifications"
ON public.admin_notifications
FOR INSERT
WITH CHECK (true);

-- Create index for performance
CREATE INDEX idx_admin_notifications_admin_id ON public.admin_notifications(admin_id);
CREATE INDEX idx_admin_notifications_created_at ON public.admin_notifications(created_at DESC);

-- Add trigger for updated_at
CREATE TRIGGER update_admin_notifications_updated_at
  BEFORE UPDATE ON public.admin_notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();