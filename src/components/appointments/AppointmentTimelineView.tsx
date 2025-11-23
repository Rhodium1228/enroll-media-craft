import { useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AppointmentWithDetails,
  groupAppointmentsByStaff,
  timeToMinutes,
  minutesToPixels,
  formatTimeRange,
  getAppointmentStatusColor,
} from "@/lib/appointmentUtils";

interface AppointmentTimelineViewProps {
  appointments: AppointmentWithDetails[];
  date: Date;
  onAppointmentClick?: (appointment: AppointmentWithDetails) => void;
}

export const AppointmentTimelineView = ({
  appointments,
  date,
  onAppointmentClick,
}: AppointmentTimelineViewProps) => {
  const pixelsPerHour = 80;
  const startHour = 7; // 7 AM
  const endHour = 21; // 9 PM
  const totalHours = endHour - startHour;

  const groupedAppointments = useMemo(
    () => groupAppointmentsByStaff(appointments),
    [appointments]
  );

  const staffIds = Object.keys(groupedAppointments);

  // Generate time labels for the timeline
  const timeLabels = useMemo(() => {
    const labels = [];
    for (let hour = startHour; hour <= endHour; hour++) {
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      labels.push(`${displayHour} ${ampm}`);
    }
    return labels;
  }, []);

  const getAppointmentStyle = (appointment: AppointmentWithDetails) => {
    const startMinutes = timeToMinutes(appointment.start_time);
    const endMinutes = timeToMinutes(appointment.end_time);
    const startOffset = startMinutes - startHour * 60;
    const duration = endMinutes - startMinutes;

    return {
      left: `${minutesToPixels(startOffset, pixelsPerHour)}px`,
      width: `${minutesToPixels(duration, pixelsPerHour)}px`,
    };
  };

  if (staffIds.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No appointments scheduled for this date
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Time labels */}
      <div className="flex items-center">
        <div className="w-32 flex-shrink-0" />
        <div className="relative flex-1">
          <div className="flex" style={{ width: `${totalHours * pixelsPerHour}px` }}>
            {timeLabels.map((label, idx) => (
              <div
                key={idx}
                className="text-xs text-muted-foreground text-center"
                style={{ width: `${pixelsPerHour}px` }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline grid and appointments */}
      <ScrollArea className="h-[600px]">
        <div className="space-y-2">
          {staffIds.map((staffId) => {
            const staffAppointments = groupedAppointments[staffId];
            const staff = staffAppointments[0]?.staff;

            if (!staff) return null;

            return (
              <div key={staffId} className="flex items-center">
                {/* Staff info */}
                <div className="w-32 flex-shrink-0 flex items-center gap-2 pr-4">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={staff.profile_image_url} />
                    <AvatarFallback>
                      {staff.first_name[0]}
                      {staff.last_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium truncate">
                    {staff.first_name} {staff.last_name}
                  </span>
                </div>

                {/* Timeline */}
                <div className="relative flex-1 h-16">
                  {/* Grid background */}
                  <div
                    className="absolute inset-0 flex"
                    style={{ width: `${totalHours * pixelsPerHour}px` }}
                  >
                    {Array.from({ length: totalHours }).map((_, idx) => (
                      <div
                        key={idx}
                        className="border-r border-border"
                        style={{ width: `${pixelsPerHour}px` }}
                      />
                    ))}
                  </div>

                  {/* Appointment blocks */}
                  {staffAppointments.map((appointment) => (
                    <Card
                      key={appointment.id}
                      className={`absolute top-1 h-14 cursor-pointer hover:shadow-md transition-shadow ${getAppointmentStatusColor(appointment.status)} border-l-4 overflow-hidden`}
                      style={getAppointmentStyle(appointment)}
                      onClick={() => onAppointmentClick?.(appointment)}
                    >
                      <div className="p-2 h-full overflow-hidden">
                        <div className="text-xs font-semibold truncate">
                          {appointment.customer_name}
                        </div>
                        {appointment.service && (
                          <div className="text-xs text-muted-foreground truncate">
                            {appointment.service.title}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          {formatTimeRange(appointment.start_time, appointment.end_time)}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};
