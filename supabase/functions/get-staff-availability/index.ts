import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Read from JSON body instead of query parameters
    const { serviceId, branchId, date, startTime } = await req.json();

    if (!serviceId || !branchId || !date || !startTime) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get service duration
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('duration')
      .eq('id', serviceId)
      .single();

    if (serviceError) throw serviceError;

    // Calculate end time
    const [hours, minutes] = startTime.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + service.duration;
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    const endTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;

    // Get staff assigned to this branch on this date who can provide this service
    const { data: assignments, error: assignError } = await supabase
      .from('staff_date_assignments')
      .select(`
        staff_id,
        time_slots,
        staff:staff_id (
          id,
          first_name,
          last_name,
          profile_image_url,
          status
        )
      `)
      .eq('branch_id', branchId)
      .eq('date', date);

    if (assignError) throw assignError;

    // Get staff who can provide this service
    const { data: staffServices, error: ssError } = await supabase
      .from('staff_services')
      .select('staff_id')
      .eq('service_id', serviceId)
      .eq('branch_id', branchId);

    if (ssError) throw ssError;

    const qualifiedStaffIds = new Set(staffServices.map((ss: any) => ss.staff_id));

    // Get existing appointments for this date
    const { data: existingAppointments, error: apptError } = await supabase
      .from('appointments')
      .select('staff_id, start_time, end_time')
      .eq('branch_id', branchId)
      .eq('date', date)
      .neq('status', 'cancelled');

    if (apptError) throw apptError;

    // Filter available staff
    const availableStaff = (assignments || [])
      .filter((assignment: any) => {
        const staff = assignment.staff;
        if (!staff || staff.status !== 'active') return false;
        if (!qualifiedStaffIds.has(staff.id)) return false;

        // Check if requested time fits within staff's working hours
        const timeSlots = assignment.time_slots as { start: string; end: string }[];
        const fitsInSlot = timeSlots.some((slot: any) => 
          startTime >= slot.start && endTime <= slot.end
        );
        if (!fitsInSlot) return false;

        // Check for conflicts with existing appointments
        const hasConflict = (existingAppointments || []).some((appt: any) => {
          if (appt.staff_id !== staff.id) return false;
          return !(endTime <= appt.start_time || startTime >= appt.end_time);
        });

        return !hasConflict;
      })
      .map((assignment: any) => ({
        id: assignment.staff.id,
        first_name: assignment.staff.first_name,
        last_name: assignment.staff.last_name,
        profile_image_url: assignment.staff.profile_image_url,
      }));

    console.log('Available staff:', availableStaff.length);

    return new Response(
      JSON.stringify({ staff: availableStaff }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error in get-staff-availability:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
