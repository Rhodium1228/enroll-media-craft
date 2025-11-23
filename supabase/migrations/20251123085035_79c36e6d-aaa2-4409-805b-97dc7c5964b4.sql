-- Enable realtime for staff_date_assignments table
ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_date_assignments;

-- Enable realtime for branch_schedule_overrides table
ALTER PUBLICATION supabase_realtime ADD TABLE public.branch_schedule_overrides;