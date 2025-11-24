-- Add booking_reference column to appointments table for public booking management
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS booking_reference TEXT UNIQUE;

-- Create index for faster booking reference lookups
CREATE INDEX IF NOT EXISTS idx_appointments_booking_reference 
ON public.appointments(booking_reference);

-- Create function to generate unique booking references
CREATE OR REPLACE FUNCTION generate_booking_reference()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Create trigger to auto-generate booking references for new appointments
CREATE OR REPLACE FUNCTION set_booking_reference()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.booking_reference IS NULL THEN
    NEW.booking_reference := generate_booking_reference();
    -- Ensure uniqueness
    WHILE EXISTS (SELECT 1 FROM appointments WHERE booking_reference = NEW.booking_reference) LOOP
      NEW.booking_reference := generate_booking_reference();
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_set_booking_reference ON public.appointments;
CREATE TRIGGER tr_set_booking_reference
BEFORE INSERT ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION set_booking_reference();

-- Add RLS policy for public booking creation
-- Public users can create appointments with customer details
CREATE POLICY "Public users can create bookings"
ON public.appointments
FOR INSERT
TO anon
WITH CHECK (
  customer_name IS NOT NULL AND
  customer_email IS NOT NULL AND
  date >= CURRENT_DATE
);

-- Add RLS policy for public booking retrieval by reference
CREATE POLICY "Anyone can view bookings by reference"
ON public.appointments
FOR SELECT
TO anon
USING (booking_reference IS NOT NULL);

-- Add RLS policy for public booking updates by reference
CREATE POLICY "Customers can update their bookings by reference"
ON public.appointments
FOR UPDATE
TO anon
USING (
  booking_reference IS NOT NULL AND
  customer_email IS NOT NULL AND
  date >= CURRENT_DATE AND
  status NOT IN ('completed', 'cancelled')
)
WITH CHECK (
  booking_reference IS NOT NULL AND
  customer_email IS NOT NULL AND
  date >= CURRENT_DATE
);

-- Add RLS policy for public booking cancellation by reference
CREATE POLICY "Customers can cancel their bookings by reference"
ON public.appointments
FOR DELETE
TO anon
USING (
  booking_reference IS NOT NULL AND
  customer_email IS NOT NULL AND
  date >= CURRENT_DATE AND
  status NOT IN ('completed', 'cancelled')
);

-- Make services publicly viewable
CREATE POLICY "Public users can view services"
ON public.services
FOR SELECT
TO anon
USING (true);

-- Make branches publicly viewable (for service location context)
CREATE POLICY "Public users can view active branches"
ON public.branches
FOR SELECT
TO anon
USING (status = 'active');

-- Make staff publicly viewable (for stylist selection)
CREATE POLICY "Public users can view active staff"
ON public.staff
FOR SELECT
TO anon
USING (status = 'active');

-- Make staff_services publicly viewable (to know which services each staff provides)
CREATE POLICY "Public users can view staff services"
ON public.staff_services
FOR SELECT
TO anon
USING (true);

-- Make staff_date_assignments publicly viewable (for availability checking)
CREATE POLICY "Public users can view staff assignments"
ON public.staff_date_assignments
FOR SELECT
TO anon
USING (true);