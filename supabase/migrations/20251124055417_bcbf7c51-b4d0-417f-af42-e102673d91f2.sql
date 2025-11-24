-- Add gallery field to services table for multiple images
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS gallery jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.services.gallery IS 'Array of image URLs for service gallery/carousel';