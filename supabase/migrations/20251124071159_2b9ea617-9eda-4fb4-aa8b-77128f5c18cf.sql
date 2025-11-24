-- Add geofence radius and GPS coordinates to branches table
ALTER TABLE public.branches 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS geofence_radius INTEGER DEFAULT 100; -- radius in meters

COMMENT ON COLUMN public.branches.latitude IS 'Branch latitude coordinate for geofencing';
COMMENT ON COLUMN public.branches.longitude IS 'Branch longitude coordinate for geofencing';
COMMENT ON COLUMN public.branches.geofence_radius IS 'Allowed radius in meters for staff clock in/out';