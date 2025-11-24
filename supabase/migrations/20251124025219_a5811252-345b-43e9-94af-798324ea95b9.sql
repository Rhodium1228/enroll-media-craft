-- Add service_type field to services table
ALTER TABLE public.services
ADD COLUMN service_type TEXT;

-- Create service_reviews table
CREATE TABLE public.service_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_service_reviews_service_id ON public.service_reviews(service_id);
CREATE INDEX idx_service_reviews_rating ON public.service_reviews(rating);

-- Enable RLS on service_reviews
ALTER TABLE public.service_reviews ENABLE ROW LEVEL SECURITY;

-- RLS policies for service_reviews
-- Admins can view all reviews for their services
CREATE POLICY "Admins can view reviews for their services"
ON public.service_reviews
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.services s
    JOIN public.branches b ON b.id = s.branch_id
    WHERE s.id = service_reviews.service_id
    AND b.created_by = auth.uid()
  )
);

-- Public users can view all reviews
CREATE POLICY "Public users can view all reviews"
ON public.service_reviews
FOR SELECT
USING (true);

-- Customers can create reviews for their completed appointments
CREATE POLICY "Customers can create reviews"
ON public.service_reviews
FOR INSERT
WITH CHECK (
  customer_email IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.id = service_reviews.appointment_id
    AND a.customer_email = service_reviews.customer_email
    AND a.status = 'completed'
  )
);

-- Update trigger for service_reviews
CREATE TRIGGER update_service_reviews_updated_at
BEFORE UPDATE ON public.service_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();