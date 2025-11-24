-- Fix search_path security issue for booking reference functions
CREATE OR REPLACE FUNCTION generate_booking_reference()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION set_booking_reference()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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