-- Create services table
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  duration INTEGER NOT NULL, -- duration in minutes
  cost DECIMAL(10, 2) NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admin users can view all services"
ON public.services
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admin users can create services"
ON public.services
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.branches
    WHERE id = branch_id
    AND created_by = auth.uid()
  )
);

CREATE POLICY "Admin users can update their services"
ON public.services
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.branches
    WHERE id = branch_id
    AND created_by = auth.uid()
  )
);

CREATE POLICY "Admin users can delete their services"
ON public.services
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.branches
    WHERE id = branch_id
    AND created_by = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_services_updated_at
BEFORE UPDATE ON public.services
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for service images
INSERT INTO storage.buckets (id, name, public)
VALUES ('service-images', 'service-images', true)
ON CONFLICT (id) DO NOTHING;