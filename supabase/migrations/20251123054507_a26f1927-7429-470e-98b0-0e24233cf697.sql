-- Create branches table with comprehensive fields
CREATE TABLE public.branches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  open_hours JSONB NOT NULL DEFAULT '{}',
  appointment_padding INTEGER DEFAULT 15,
  logo_url TEXT,
  hero_image_url TEXT,
  gallery JSONB DEFAULT '[]',
  compliance_docs JSONB DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

-- Admin users can view all branches
CREATE POLICY "Admin users can view all branches"
ON public.branches
FOR SELECT
USING (true);

-- Admin users can create branches
CREATE POLICY "Admin users can create branches"
ON public.branches
FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Admin users can update their branches
CREATE POLICY "Admin users can update their branches"
ON public.branches
FOR UPDATE
USING (auth.uid() = created_by);

-- Admin users can delete their branches
CREATE POLICY "Admin users can delete their branches"
ON public.branches
FOR DELETE
USING (auth.uid() = created_by);

-- Create storage buckets for branch files
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('branch-logos', 'branch-logos', true),
  ('branch-heroes', 'branch-heroes', true),
  ('branch-gallery', 'branch-gallery', true),
  ('branch-compliance', 'branch-compliance', false);

-- Storage policies for branch logos
CREATE POLICY "Anyone can view branch logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'branch-logos');

CREATE POLICY "Authenticated users can upload logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'branch-logos' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can update their logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'branch-logos' AND auth.uid() IS NOT NULL);

-- Storage policies for hero images
CREATE POLICY "Anyone can view hero images"
ON storage.objects FOR SELECT
USING (bucket_id = 'branch-heroes');

CREATE POLICY "Authenticated users can upload hero images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'branch-heroes' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can update hero images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'branch-heroes' AND auth.uid() IS NOT NULL);

-- Storage policies for gallery
CREATE POLICY "Anyone can view gallery images"
ON storage.objects FOR SELECT
USING (bucket_id = 'branch-gallery');

CREATE POLICY "Authenticated users can upload gallery images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'branch-gallery' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can update gallery images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'branch-gallery' AND auth.uid() IS NOT NULL);

-- Storage policies for compliance documents (private)
CREATE POLICY "Authenticated users can view compliance docs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'branch-compliance' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Authenticated users can upload compliance docs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'branch-compliance' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can update compliance docs"
ON storage.objects FOR UPDATE
USING (bucket_id = 'branch-compliance' AND auth.uid() IS NOT NULL);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_branches_updated_at
BEFORE UPDATE ON public.branches
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();