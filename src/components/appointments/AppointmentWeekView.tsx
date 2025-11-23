import { useMemo } from "react";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AppointmentWithDetails, formatTimeRange, getAppointmentStatusColor } from "@/lib/appointmentUtils";
import { Badge } from "@/components/ui/badge";

interface AppointmentWeekViewProps {
  appointments: AppointmentWithDetails[];
  currentDate: Date;
  onAppointmentClick?: (appointment: AppointmentWithDetails) => void;
  onDayClick?: (date: Date) => void;
}

export const AppointmentWeekView = ({
  appointments,
  currentDate,
  onAppointmentClick,
  onDayClick,
}: AppointmentWeekViewProps) => {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const appointmentsByDay = useMemo(() => {
    const grouped: Record<string, AppointmentWithDetails[]> = {};
    
    weekDays.forEach(day => {
      const dayKey = format(day, 'yyyy-MM-dd');
      grouped[dayKey] = appointments.filter(apt => 
        apt.date === dayKey
      ).sort((a, b) => a.start_time.localeCompare(b.start_time));
    });
    
    return grouped;
  }, [appointments, weekDays]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
      {weekDays.map((day) => {
        const dayKey = format(day, 'yyyy-MM-dd');
        const dayAppointments = appointmentsByDay[dayKey] || [];
        const isToday = isSameDay(day, new Date());

        return (
          <Card
            key={dayKey}
            className={`${isToday ? 'border-primary' : ''} cursor-pointer hover:shadow-md transition-shadow`}
            onClick={() => onDayClick?.(day)}
          >
            <CardHeader className="p-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>{format(day, 'EEE')}</span>
                <span className={isToday ? 'text-primary font-bold' : ''}>
                  {format(day, 'd')}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {dayAppointments.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No appointments
                    </p>
                  ) : (
                    dayAppointments.map((appointment) => (
                      <Card
                        key={appointment.id}
                        className={`${getAppointmentStatusColor(appointment.status)} border-l-4 cursor-pointer hover:shadow-sm transition-shadow`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onAppointmentClick?.(appointment);
                        }}
                      >
                        <CardContent className="p-2">
                          <div className="space-y-1">
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
                            {appointment.staff && (
                              <div className="text-xs text-muted-foreground truncate">
                                {appointment.staff.first_name} {appointment.staff.last_name}
                              </div>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {appointment.status}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
