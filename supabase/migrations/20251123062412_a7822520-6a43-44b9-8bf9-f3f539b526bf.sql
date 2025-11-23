-- Create staff table
CREATE TABLE public.staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  profile_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) NOT NULL
);

ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- Create staff_branches junction table with schedules
CREATE TABLE public.staff_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE NOT NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE NOT NULL,
  working_hours JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(staff_id, branch_id)
);

ALTER TABLE public.staff_branches ENABLE ROW LEVEL SECURITY;

-- Create staff_services junction table
CREATE TABLE public.staff_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE NOT NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE NOT NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(staff_id, service_id, branch_id)
);

ALTER TABLE public.staff_services ENABLE ROW LEVEL SECURITY;

-- RLS Policies for staff table
CREATE POLICY "Admins can view staff"
ON public.staff
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.staff_branches sb
    JOIN public.branches b ON b.id = sb.branch_id
    WHERE sb.staff_id = staff.id
    AND b.created_by = auth.uid()
  )
  OR created_by = auth.uid()
);

CREATE POLICY "Admins can create staff"
ON public.staff
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can update their staff"
ON public.staff
FOR UPDATE
TO authenticated
USING (created_by = auth.uid());

CREATE POLICY "Admins can delete their staff"
ON public.staff
FOR DELETE
TO authenticated
USING (created_by = auth.uid());

-- RLS Policies for staff_branches
CREATE POLICY "Admins can view staff_branches"
ON public.staff_branches
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.branches
    WHERE branches.id = staff_branches.branch_id
    AND branches.created_by = auth.uid()
  )
);

CREATE POLICY "Admins can create staff_branches"
ON public.staff_branches
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.branches
    WHERE branches.id = staff_branches.branch_id
    AND branches.created_by = auth.uid()
  )
);

CREATE POLICY "Admins can update staff_branches"
ON public.staff_branches
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.branches
    WHERE branches.id = staff_branches.branch_id
    AND branches.created_by = auth.uid()
  )
);

CREATE POLICY "Admins can delete staff_branches"
ON public.staff_branches
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.branches
    WHERE branches.id = staff_branches.branch_id
    AND branches.created_by = auth.uid()
  )
);

-- RLS Policies for staff_services
CREATE POLICY "Admins can view staff_services"
ON public.staff_services
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.branches
    WHERE branches.id = staff_services.branch_id
    AND branches.created_by = auth.uid()
  )
);

CREATE POLICY "Admins can create staff_services"
ON public.staff_services
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.branches
    WHERE branches.id = staff_services.branch_id
    AND branches.created_by = auth.uid()
  )
);

CREATE POLICY "Admins can update staff_services"
ON public.staff_services
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.branches
    WHERE branches.id = staff_services.branch_id
    AND branches.created_by = auth.uid()
  )
);

CREATE POLICY "Admins can delete staff_services"
ON public.staff_services
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.branches
    WHERE branches.id = staff_services.branch_id
    AND branches.created_by = auth.uid()
  )
);

-- Triggers for updated_at
CREATE TRIGGER update_staff_updated_at
BEFORE UPDATE ON public.staff
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_staff_branches_updated_at
BEFORE UPDATE ON public.staff_branches
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for staff profiles
INSERT INTO storage.buckets (id, name, public)
VALUES ('staff-profiles', 'staff-profiles', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for staff-profiles bucket
CREATE POLICY "Staff profile images are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'staff-profiles');

CREATE POLICY "Authenticated users can upload staff profiles"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'staff-profiles');

CREATE POLICY "Authenticated users can update staff profiles"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'staff-profiles');

CREATE POLICY "Authenticated users can delete staff profiles"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'staff-profiles');