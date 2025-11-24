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

    const url = new URL(req.url);
    const bookingReference = url.searchParams.get('reference');
    const customerEmail = url.searchParams.get('email');

    if (!bookingReference || !customerEmail) {
      return new Response(
        JSON.stringify({ error: 'Missing booking reference or email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'GET') {
      // Retrieve booking
      const { data: booking, error } = await supabase
        .from('appointments')
        .select(`
          *,
          service:service_id (
            id,
            title,
            duration,
            cost
          ),
          branch:branch_id (
            id,
            name,
            address,
            phone
          ),
          staff:staff_id (
            id,
            first_name,
            last_name,
            profile_image_url
          )
        `)
        .eq('booking_reference', bookingReference)
        .eq('customer_email', customerEmail)
        .single();

      if (error || !booking) {
        return new Response(
          JSON.stringify({ error: 'Booking not found or email does not match' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ booking }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'PUT') {
      // Update booking
      const { date, startTime } = await req.json();

      if (!date || !startTime) {
        return new Response(
          JSON.stringify({ error: 'Missing date or start time' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get current booking to calculate new end time
      const { data: currentBooking, error: fetchError } = await supabase
        .from('appointments')
        .select('service:service_id(duration)')
        .eq('booking_reference', bookingReference)
        .eq('customer_email', customerEmail)
        .single();

      if (fetchError) throw fetchError;

      // Calculate new end time
      const [hours, minutes] = startTime.split(':').map(Number);
      const startMinutes = hours * 60 + minutes;
      const endMinutes = startMinutes + (currentBooking.service as any).duration;
      const endHours = Math.floor(endMinutes / 60);
      const endMins = endMinutes % 60;
      const endTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;

      const { data: updated, error: updateError } = await supabase
        .from('appointments')
        .update({
          date,
          start_time: startTime,
          end_time: endTime,
          updated_at: new Date().toISOString(),
        })
        .eq('booking_reference', bookingReference)
        .eq('customer_email', customerEmail)
        .select()
        .single();

      if (updateError) throw updateError;

      console.log('Booking updated:', bookingReference);

      return new Response(
        JSON.stringify({ success: true, booking: updated }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'DELETE') {
      // Cancel booking
      const { data: cancelled, error: cancelError } = await supabase
        .from('appointments')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('booking_reference', bookingReference)
        .eq('customer_email', customerEmail)
        .select()
        .single();

      if (cancelError) throw cancelError;

      console.log('Booking cancelled:', bookingReference);

      return new Response(
        JSON.stringify({ success: true, message: 'Booking cancelled successfully' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in manage-booking:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
