import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Calendar as CalendarIcon } from "lucide-react";
import { AppointmentWithDetails } from "@/lib/appointmentUtils";
import { getServiceTypeDotClass } from "@/lib/serviceColors";
import { StaffUtilizationIndicator } from "./StaffUtilizationIndicator";
import { calculateStaffUtilization, StaffUtilizationMetrics } from "@/lib/staffUtilization";
import type { TimeSlot } from "@/lib/dateAssignmentUtils";

interface Staff {
  id: string;
  first_name: string;
  last_name: string;
  profile_image_url: string | null;
}

interface StaffDayViewProps {
  date: Date;
  branchId?: string;
}

interface StaffWithSchedule extends Staff {
  timeSlots: TimeSlot[];
  appointments: AppointmentWithDetails[];
  utilization: StaffUtilizationMetrics;
}

export const StaffDayView = ({ date, branchId }: StaffDayViewProps) => {
  const [staffSchedules, setStaffSchedules] = useState<StaffWithSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const dateStr = format(date, "yyyy-MM-dd");

  useEffect(() => {
    fetchStaffSchedules();

    const channel = supabase
      .channel(`staff-day-view-${dateStr}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
          filter: `date=eq.${dateStr}`,
        },
        () => fetchStaffSchedules()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "staff_date_assignments",
          filter: `date=eq.${dateStr}`,
        },
        () => fetchStaffSchedules()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [date, branchId]);

  const fetchStaffSchedules = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch staff assignments for this date
      let assignmentsQuery = supabase
        .from("staff_date_assignments")
        .select(`
          staff_id,
          time_slots,
          staff:staff_id (
            id,
            first_name,
            last_name,
            profile_image_url
          )
        `)
        .eq("date", dateStr);

      if (branchId) {
        assignmentsQuery = assignmentsQuery.eq("branch_id", branchId);
      }

      const { data: assignments } = await assignmentsQuery;

      if (!assignments || assignments.length === 0) {
        setStaffSchedules([]);
        setLoading(false);
        return;
      }

      // Fetch appointments for these staff members
      const staffIds = assignments.map((a: any) => a.staff_id);
      let appointmentsQuery = supabase
        .from("appointments")
        .select(`
          *,
          staff:staff_id (id, first_name, last_name, profile_image_url),
          service:service_id (id, title, duration, cost, service_type),
          branch:branch_id (id, name)
        `)
        .eq("date", dateStr)
        .in("staff_id", staffIds)
        .in("status", ["scheduled", "in_progress"]);

      if (branchId) {
        appointmentsQuery = appointmentsQuery.eq("branch_id", branchId);
      }

      const { data: appointments } = await appointmentsQuery;

      // Group and calculate utilization
      const staffMap = new Map<string, StaffWithSchedule>();

      assignments.forEach((assignment: any) => {
        const staff = assignment.staff;
        if (!staff) return;

        const staffAppointments = (appointments || []).filter(
          (apt: any) => apt.staff_id === staff.id
        );

        const utilization = calculateStaffUtilization(
          staff.id,
          `${staff.first_name} ${staff.last_name}`,
          assignment.time_slots || [],
          staffAppointments.map((apt: any) => ({
            start_time: apt.start_time,
            end_time: apt.end_time,
          }))
        );

        staffMap.set(staff.id, {
          ...staff,
          timeSlots: assignment.time_slots || [],
          appointments: staffAppointments as AppointmentWithDetails[],
          utilization,
        });
      });

      setStaffSchedules(Array.from(staffMap.values()));
    } catch (error) {
      console.error("Error fetching staff schedules:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (staffSchedules.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <CalendarIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No staff scheduled for this day</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {staffSchedules.map((staff) => (
        <Card key={staff.id} className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={staff.profile_image_url || undefined} />
                  <AvatarFallback>
                    {staff.first_name[0]}
                    {staff.last_name[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg">
                    {staff.first_name} {staff.last_name}
                  </CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {staff.timeSlots.map((slot, idx) => (
                      <span key={idx}>
                        {slot.start} - {slot.end}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <StaffUtilizationIndicator metrics={staff.utilization} compact />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <StaffUtilizationIndicator metrics={staff.utilization} />
              
              {staff.appointments.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Appointments ({staff.appointments.length})</h4>
                  <div className="space-y-2">
                    {staff.appointments.map((appointment) => (
                      <div
                        key={appointment.id}
                        className="flex items-center justify-between p-2 rounded-lg border bg-card"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-3 h-3 rounded-full ${getServiceTypeDotClass(
                              (appointment.service as any)?.service_type
                            )}`}
                          />
                          <div>
                            <p className="text-sm font-medium">{appointment.customer_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {appointment.service?.title}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {appointment.start_time} - {appointment.end_time}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No appointments scheduled
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
