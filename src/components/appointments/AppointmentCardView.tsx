import { useMemo, useState } from "react";
import { useSwipeable } from "react-swipeable";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, User, Briefcase, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
  onStatusUpdate?: () => void;
}

interface SwipeableCardProps {
  appointment: AppointmentWithDetails;
  onAppointmentClick?: (appointment: AppointmentWithDetails) => void;
  onStatusUpdate?: () => void;
}

const SwipeableAppointmentCard = ({ 
  appointment, 
  onAppointmentClick,
  onStatusUpdate 
}: SwipeableCardProps) => {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const handleStatusUpdate = async (newStatus: string) => {
    if (isUpdating) return;
    
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", appointment.id);

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Appointment marked as ${newStatus.replace('_', ' ')}`,
      });
      
      onStatusUpdate?.();
    } catch (error) {
      console.error("Error updating appointment status:", error);
      toast({
        title: "Error",
        description: "Failed to update appointment status",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
      setSwipeOffset(0);
    }
  };

  const handlers = useSwipeable({
    onSwiping: (eventData) => {
      if (appointment.status === 'completed' || appointment.status === 'cancelled') {
        return; // Don't allow swiping on completed/cancelled appointments
      }
      setSwipeOffset(eventData.deltaX);
    },
    onSwipedRight: () => {
      if (appointment.status !== 'completed' && Math.abs(swipeOffset) > 100) {
        handleStatusUpdate('completed');
      } else {
        setSwipeOffset(0);
      }
    },
    onSwipedLeft: () => {
      if (appointment.status !== 'cancelled' && Math.abs(swipeOffset) > 100) {
        handleStatusUpdate('cancelled');
      } else {
        setSwipeOffset(0);
      }
    },
    trackMouse: false,
    trackTouch: true,
  });

  const canSwipe = appointment.status !== 'completed' && appointment.status !== 'cancelled';
  const showRightAction = swipeOffset > 50;
  const showLeftAction = swipeOffset < -50;

  return (
    <div className="relative overflow-hidden">
      {/* Swipe Actions Background */}
      {canSwipe && (
        <>
          <div 
            className={`absolute inset-0 bg-green-500/20 flex items-center justify-start pl-6 transition-opacity ${showRightAction ? 'opacity-100' : 'opacity-0'}`}
          >
            <Check className="h-6 w-6 text-green-600" />
            <span className="ml-2 font-semibold text-green-600">Complete</span>
          </div>
          <div 
            className={`absolute inset-0 bg-red-500/20 flex items-center justify-end pr-6 transition-opacity ${showLeftAction ? 'opacity-100' : 'opacity-0'}`}
          >
            <span className="mr-2 font-semibold text-red-600">Cancel</span>
            <X className="h-6 w-6 text-red-600" />
          </div>
        </>
      )}

      {/* Swipeable Card */}
      <div
        {...handlers}
        style={{
          transform: canSwipe ? `translateX(${swipeOffset}px)` : 'none',
          transition: isUpdating ? 'transform 0.3s ease-out' : 'none',
        }}
      >
        <Card
          className={`${getAppointmentStatusColor(appointment.status)} border-l-4 cursor-pointer active:scale-[0.98] transition-all shadow-sm hover:shadow-md`}
          onClick={() => onAppointmentClick?.(appointment)}
        >
          <CardContent className="p-3 space-y-2.5">
            {/* Staff Info */}
            {appointment.staff && (
              <div className="flex items-center gap-2.5">
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarImage src={appointment.staff.profile_image_url} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                    {appointment.staff.first_name[0]}
                    {appointment.staff.last_name[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">
                    {appointment.staff.first_name} {appointment.staff.last_name}
                  </div>
                  <div className="text-xs text-muted-foreground">Staff Member</div>
                </div>
              </div>
            )}

            {/* Customer Info */}
            <div className="flex items-start gap-2.5 bg-muted/30 rounded-lg p-2.5">
              <User className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">
                  {appointment.customer_name}
                </div>
                {appointment.customer_phone && (
                  <div className="text-xs text-muted-foreground">
                    {appointment.customer_phone}
                  </div>
                )}
                {appointment.customer_email && (
                  <div className="text-xs text-muted-foreground truncate">
                    {appointment.customer_email}
                  </div>
                )}
              </div>
            </div>

            {/* Service Info */}
            {appointment.service && (
              <div className="flex items-start gap-2.5 bg-muted/30 rounded-lg p-2.5">
                <Briefcase className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">
                    {appointment.service.title}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {appointment.service.duration} min • ${appointment.service.cost}
                  </div>
                </div>
              </div>
            )}

            {/* Time and Status */}
            <div className="flex items-center justify-between gap-2 pt-1.5 border-t">
              <div className="flex items-center gap-1.5 text-xs">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
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
              <div className="text-xs text-muted-foreground bg-muted/30 rounded p-2 border-l-2 border-muted-foreground/20">
                {appointment.notes}
              </div>
            )}

            {/* Swipe hint for incomplete appointments */}
            {canSwipe && (
              <div className="text-xs text-center text-muted-foreground/60 pt-1">
                Swipe right to complete • Swipe left to cancel
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export const AppointmentCardView = ({
  appointments,
  date,
  onAppointmentClick,
  onStatusUpdate,
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
      <div className="space-y-2.5 p-3">
        {sortedAppointments.map((appointment) => (
          <SwipeableAppointmentCard
            key={appointment.id}
            appointment={appointment}
            onAppointmentClick={onAppointmentClick}
            onStatusUpdate={onStatusUpdate}
          />
        ))}
      </div>
    </ScrollArea>
  );
};
