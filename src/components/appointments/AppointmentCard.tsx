import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock, User, Phone, Mail, Edit, Trash2, CheckCircle2 } from "lucide-react";
import { AppointmentWithDetails, formatTimeRange, getAppointmentStatusColor } from "@/lib/appointmentUtils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AppointmentCardProps {
  appointment: AppointmentWithDetails;
  onEdit?: (appointment: AppointmentWithDetails) => void;
  onDelete?: (appointmentId: string) => void;
  onUpdateStatus?: (appointmentId: string, status: AppointmentWithDetails['status']) => void;
}

export const AppointmentCard = ({
  appointment,
  onEdit,
  onDelete,
  onUpdateStatus,
}: AppointmentCardProps) => {
  const statusLabels = {
    scheduled: 'Scheduled',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
    no_show: 'No Show',
  };

  return (
    <Card className={`${getAppointmentStatusColor(appointment.status)} border-2`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {appointment.staff && (
              <Avatar className="h-10 w-10 flex-shrink-0">
                <AvatarImage src={appointment.staff.profile_image_url} />
                <AvatarFallback>
                  {appointment.staff.first_name[0]}
                  {appointment.staff.last_name[0]}
                </AvatarFallback>
              </Avatar>
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-sm truncate">{appointment.customer_name}</h4>
                <Badge variant="outline" className="text-xs">
                  {statusLabels[appointment.status]}
                </Badge>
              </div>
              
              {appointment.service && (
                <p className="text-sm text-muted-foreground mb-1">
                  {appointment.service.title} ({appointment.service.duration} min)
                </p>
              )}
              
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                <Clock className="h-3 w-3" />
                <span>{formatTimeRange(appointment.start_time, appointment.end_time)}</span>
              </div>

              {appointment.staff && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span>
                    {appointment.staff.first_name} {appointment.staff.last_name}
                  </span>
                </div>
              )}

              {appointment.customer_phone && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  <span>{appointment.customer_phone}</span>
                </div>
              )}

              {appointment.customer_email && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Mail className="h-3 w-3" />
                  <span className="truncate">{appointment.customer_email}</span>
                </div>
              )}

              {appointment.notes && (
                <p className="text-xs text-muted-foreground mt-2 italic">
                  {appointment.notes}
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-1 flex-shrink-0">
            {appointment.status === 'scheduled' && onUpdateStatus && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => onUpdateStatus(appointment.id, 'in_progress')}>
                    Start Service
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onUpdateStatus(appointment.id, 'completed')}>
                    Mark Completed
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onUpdateStatus(appointment.id, 'cancelled')}>
                    Cancel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onUpdateStatus(appointment.id, 'no_show')}>
                    Mark No Show
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => onEdit(appointment)}
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}

            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                onClick={() => onDelete(appointment.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
