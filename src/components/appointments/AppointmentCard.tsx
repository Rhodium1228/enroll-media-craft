import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock, User, Phone, Mail, Edit, Trash2, CheckCircle2, Globe, Building2 } from "lucide-react";
import { AppointmentWithDetails, formatTimeRange, getAppointmentStatusColor } from "@/lib/appointmentUtils";
import { getServiceTypeBadgeClass, getServiceTypeDotClass } from "@/lib/serviceColors";
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
  isRecentlyUpdated?: boolean;
}

export const AppointmentCard = ({
  appointment,
  onEdit,
  onDelete,
  onUpdateStatus,
  isRecentlyUpdated = false,
}: AppointmentCardProps) => {
  const statusLabels = {
    scheduled: 'Scheduled',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
    no_show: 'No Show',
  };

  const isPublicBooking = !!appointment.booking_reference;

  return (
    <Card className={`${getAppointmentStatusColor(appointment.status)} border-2 ${
      isRecentlyUpdated ? 'ring-2 ring-primary ring-offset-2 animate-pulse' : ''
    }`}>
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
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h4 className="font-semibold text-sm truncate">{appointment.customer_name}</h4>
                <Badge variant="outline" className="text-xs">
                  {statusLabels[appointment.status]}
                </Badge>
                {isPublicBooking ? (
                  <Badge variant="secondary" className="text-xs gap-1 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100">
                    <Globe className="h-3 w-3" />
                    Public
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs gap-1 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100">
                    <Building2 className="h-3 w-3" />
                    Internal
                  </Badge>
                )}
              </div>
              
              {appointment.booking_reference && (
                <div className="text-xs text-muted-foreground mb-1">
                  Ref: <span className="font-mono font-semibold">{appointment.booking_reference}</span>
                </div>
              )}
              
              {appointment.service && (
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${getServiceTypeDotClass((appointment.service as any).service_type)}`} />
                    <p className="text-sm text-muted-foreground">
                      {appointment.service.title} ({appointment.service.duration} min)
                    </p>
                  </div>
                  {(appointment.service as any).service_type && (
                    <Badge className={`text-xs capitalize ${getServiceTypeBadgeClass((appointment.service as any).service_type)}`}>
                      {(appointment.service as any).service_type}
                    </Badge>
                  )}
                </div>
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
