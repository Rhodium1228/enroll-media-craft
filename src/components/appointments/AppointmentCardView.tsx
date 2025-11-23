import { useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, User, Briefcase } from "lucide-react";
import {
  AppointmentWithDetails,
  groupAppointmentsByStaff,
  formatTimeRange,
  getAppointmentStatusColor,
} from "@/lib/appointmentUtils";

interface AppointmentCardViewProps {
  appointments: AppointmentWithDetails[];
  date: Date;
  onAppointmentClick?: (appointment: AppointmentWithDetails) => void;
}

export const AppointmentCardView = ({
  appointments,
  date,
  onAppointmentClick,
}: AppointmentCardViewProps) => {
  const groupedAppointments = useMemo(
    () => groupAppointmentsByStaff(appointments),
    [appointments]
  );

  const staffIds = Object.keys(groupedAppointments);

  // Sort appointments by time
  const sortedAppointments = useMemo(() => {
    return appointments.sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [appointments]);

  if (sortedAppointments.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No appointments scheduled for this date
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-300px)]">
      <div className="space-y-3 p-4">
        {sortedAppointments.map((appointment) => (
          <Card
            key={appointment.id}
            className={`${getAppointmentStatusColor(appointment.status)} border-l-4 cursor-pointer active:scale-[0.98] transition-all shadow-sm hover:shadow-md`}
            onClick={() => onAppointmentClick?.(appointment)}
          >
            <CardContent className="p-4 space-y-3">
              {/* Staff Info */}
              {appointment.staff && (
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={appointment.staff.profile_image_url} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {appointment.staff.first_name[0]}
                      {appointment.staff.last_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-base">
                      {appointment.staff.first_name} {appointment.staff.last_name}
                    </div>
                    <div className="text-sm text-muted-foreground">Staff Member</div>
                  </div>
                </div>
              )}

              {/* Customer Info */}
              <div className="flex items-start gap-3 bg-muted/30 rounded-lg p-3">
                <User className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-base">
                    {appointment.customer_name}
                  </div>
                  {appointment.customer_phone && (
                    <div className="text-sm text-muted-foreground">
                      {appointment.customer_phone}
                    </div>
                  )}
                  {appointment.customer_email && (
                    <div className="text-sm text-muted-foreground truncate">
                      {appointment.customer_email}
                    </div>
                  )}
                </div>
              </div>

              {/* Service Info */}
              {appointment.service && (
                <div className="flex items-start gap-3 bg-muted/30 rounded-lg p-3">
                  <Briefcase className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-base">
                      {appointment.service.title}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {appointment.service.duration} min • ${appointment.service.cost}
                    </div>
                  </div>
                </div>
              )}

              {/* Time and Status */}
              <div className="flex items-center justify-between gap-3 pt-2 border-t">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {formatTimeRange(appointment.start_time, appointment.end_time)}
                  </span>
                </div>
                <Badge variant="outline" className="text-xs font-semibold">
                  {appointment.status.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>

              {/* Notes if available */}
              {appointment.notes && (
                <div className="text-sm text-muted-foreground bg-muted/30 rounded p-2 border-l-2 border-muted-foreground/20">
                  {appointment.notes}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
};
