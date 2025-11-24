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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const {
      branchId,
      serviceId,
      staffId,
      date,
      startTime,
      customerName,
      customerEmail,
      customerPhone,
      notes,
    } = await req.json();

    // Validate required fields
    if (!branchId || !serviceId || !date || !startTime || !customerName || !customerEmail) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get service to calculate end time
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

    // If no staff selected, find an available one
    let selectedStaffId = staffId;
    if (!selectedStaffId) {
      // Get qualified staff who can provide this service
      const { data: staffServices, error: ssError } = await supabase
        .from('staff_services')
        .select('staff_id')
        .eq('service_id', serviceId)
        .eq('branch_id', branchId);

      if (ssError) throw ssError;

      // Get staff assigned on this date
      const { data: assignments, error: assignError } = await supabase
        .from('staff_date_assignments')
        .select('staff_id, time_slots')
        .eq('branch_id', branchId)
        .eq('date', date);

      if (assignError) throw assignError;

      // Get existing appointments
      const { data: existingAppointments, error: apptError } = await supabase
        .from('appointments')
        .select('staff_id, start_time, end_time')
        .eq('branch_id', branchId)
        .eq('date', date)
        .neq('status', 'cancelled');

      if (apptError) throw apptError;

      const qualifiedStaffIds = new Set(staffServices.map((ss: any) => ss.staff_id));

      // Find first available staff
      const availableStaff = (assignments || []).find((assignment: any) => {
        if (!qualifiedStaffIds.has(assignment.staff_id)) return false;

        const timeSlots = assignment.time_slots as { start: string; end: string }[];
        const fitsInSlot = timeSlots.some((slot: any) => 
          startTime >= slot.start && endTime <= slot.end
        );
        if (!fitsInSlot) return false;

        const hasConflict = (existingAppointments || []).some((appt: any) => {
          if (appt.staff_id !== assignment.staff_id) return false;
          return !(endTime <= appt.start_time || startTime >= appt.end_time);
        });

        return !hasConflict;
      });

      if (!availableStaff) {
        return new Response(
          JSON.stringify({ error: 'No staff available for selected time' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      selectedStaffId = availableStaff.staff_id;
    }

    // Get system user (first admin) as created_by fallback
    const { data: adminData } = await supabase.auth.admin.listUsers();
    const createdBy = adminData?.users?.[0]?.id || '00000000-0000-0000-0000-000000000000';

    // Create the appointment
    const { data: appointment, error: createError } = await supabase
      .from('appointments')
      .insert({
        branch_id: branchId,
        service_id: serviceId,
        staff_id: selectedStaffId,
        date,
        start_time: startTime,
        end_time: endTime,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone || null,
        notes: notes || null,
        status: 'scheduled',
        created_by: createdBy,
      })
      .select('*, booking_reference')
      .single();

    if (createError) throw createError;

    console.log('Public booking created:', appointment.id);

    return new Response(
      JSON.stringify({
        success: true,
        booking: appointment,
        message: 'Booking confirmed! Check your email for booking reference.',
      }),
      {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error in create-public-booking:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
