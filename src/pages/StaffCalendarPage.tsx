import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Calendar as CalendarIcon, Briefcase, MapPin, Clock, User } from "lucide-react";
import { format, isSameDay, parseISO } from "date-fns";
import { AppointmentWithDetails, formatTimeRange, getAppointmentStatusColor } from "@/lib/appointmentUtils";

interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  profile_image_url: string | null;
  status: string;
}

interface DateAssignment {
  id: string;
  date: string;
  time_slots: { start: string; end: string }[];
  reason: string | null;
  branch: {
    id: string;
    name: string;
  };
}

interface LeaveRequest {
  id: string;
  start_date: string;
  end_date: string;
  leave_type: string;
  status: string;
  reason: string | null;
}

export default function StaffCalendarPage() {
  const { staffId } = useParams<{ staffId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [staff, setStaff] = useState<StaffMember | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [assignments, setAssignments] = useState<DateAssignment[]>([]);
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (staffId) {
      fetchStaffData();
      fetchAssignments();
      fetchLeaveRequests();
    }
  }, [staffId]);

  useEffect(() => {
    if (selectedDate && staffId) {
      fetchAppointmentsForDate();
    }
  }, [selectedDate, staffId]);

  const fetchStaffData = async () => {
    try {
      const { data, error } = await supabase
        .from("staff")
        .select("*")
        .eq("id", staffId)
        .single();

      if (error) throw error;
      setStaff(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load staff member details",
        variant: "destructive",
      });
      console.error("Error fetching staff:", error);
    }
  };

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("staff_date_assignments")
        .select(`
          *,
          branch:branch_id (
            id,
            name
          )
        `)
        .eq("staff_id", staffId)
        .order("date", { ascending: true });

      if (error) throw error;
      setAssignments((data || []) as any);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load schedule assignments",
        variant: "destructive",
      });
      console.error("Error fetching assignments:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAppointmentsForDate = async () => {
    if (!selectedDate) return;

    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("appointments")
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
            name
          )
        `)
        .eq("staff_id", staffId)
        .eq("date", dateStr)
        .order("start_time", { ascending: true });

      if (error) throw error;
      setAppointments((data || []) as any);
    } catch (error: any) {
      console.error("Error fetching appointments:", error);
    }
  };

  const fetchLeaveRequests = async () => {
    try {
      const { data, error } = await supabase
        .from("staff_leave_requests")
        .select("*")
        .eq("staff_id", staffId)
        .in("status", ["pending", "approved"])
        .order("start_date", { ascending: true });

      if (error) throw error;
      setLeaveRequests(data || []);
    } catch (error: any) {
      console.error("Error fetching leave requests:", error);
    }
  };

  const getAssignmentsForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return assignments.filter((assignment) => assignment.date === dateStr);
  };

  const isDateAssigned = (date: Date) => {
    return getAssignmentsForDate(date).length > 0;
  };

  const isDateOnLeave = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return leaveRequests.some(
      (leave) =>
        leave.status === "approved" &&
        dateStr >= leave.start_date &&
        dateStr <= leave.end_date
    );
  };

  const selectedDateAssignments = selectedDate ? getAssignmentsForDate(selectedDate) : [];
  const isSelectedDateOnLeave = selectedDate ? isDateOnLeave(selectedDate) : false;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-success text-success-foreground";
      case "suspended":
        return "bg-destructive text-destructive-foreground";
      case "inactive":
        return "bg-muted text-muted-foreground";
      case "on_leave":
        return "bg-warning text-warning-foreground";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  if (!staff) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Loading staff member...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/staff")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={staff.profile_image_url || undefined} />
                <AvatarFallback className="text-lg">
                  {staff.first_name[0]}
                  {staff.last_name[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-3xl font-bold">
                  {staff.first_name} {staff.last_name}
                </h1>
                <p className="text-muted-foreground">Personal Calendar & Schedule</p>
              </div>
            </div>
          </div>
          <Badge className={getStatusColor(staff.status)}>
            {staff.status.replace("_", " ").toUpperCase()}
          </Badge>
        </div>

        {/* Contact Info */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{staff.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{staff.phone}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Schedule Calendar</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
                modifiers={{
                  assigned: (date) => isDateAssigned(date),
                  onLeave: (date) => isDateOnLeave(date),
                }}
                modifiersStyles={{
                  assigned: {
                    backgroundColor: "hsl(var(--success))",
                    color: "hsl(var(--success-foreground))",
                    fontWeight: "bold",
                  },
                  onLeave: {
                    backgroundColor: "hsl(var(--destructive))",
                    color: "hsl(var(--destructive-foreground))",
                    fontWeight: "bold",
                  },
                }}
              />
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-4 h-4 rounded bg-success"></div>
                  <span>Assigned/Working</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-4 h-4 rounded bg-destructive"></div>
                  <span>On Leave</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Day Details */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedDate ? format(selectedDate, "MMMM d, yyyy") : "Select a date"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isSelectedDateOnLeave ? (
                  <div className="text-center py-4">
                    <Badge variant="destructive" className="mb-2">On Leave</Badge>
                    <p className="text-sm text-muted-foreground">
                      This staff member is on approved leave
                    </p>
                  </div>
                ) : selectedDateAssignments.length > 0 ? (
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-3">
                      {selectedDateAssignments.map((assignment) => (
                        <Card key={assignment.id}>
                          <CardContent className="pt-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span className="font-semibold">{assignment.branch.name}</span>
                              </div>
                              {assignment.time_slots.map((slot, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-sm">
                                  <Clock className="h-3 w-3 text-muted-foreground" />
                                  <span>
                                    {slot.start} - {slot.end}
                                  </span>
                                </div>
                              ))}
                              {assignment.reason && (
                                <p className="text-xs text-muted-foreground italic">
                                  {assignment.reason}
                                </p>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CalendarIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No assignments for this date</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Appointments for Selected Date */}
            {selectedDate && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    Appointments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {appointments.length > 0 ? (
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-3">
                        {appointments.map((appointment) => (
                          <Card
                            key={appointment.id}
                            className={`${getAppointmentStatusColor(appointment.status)} border-l-4`}
                          >
                            <CardContent className="pt-4">
                              <div className="space-y-1">
                                <div className="font-semibold">{appointment.customer_name}</div>
                                {appointment.service && (
                                  <div className="text-sm text-muted-foreground">
                                    {appointment.service.title}
                                  </div>
                                )}
                                <div className="flex items-center gap-2 text-sm">
                                  <Clock className="h-3 w-3" />
                                  {formatTimeRange(appointment.start_time, appointment.end_time)}
                                </div>
                                {appointment.branch && (
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <MapPin className="h-3 w-3" />
                                    {appointment.branch.name}
                                  </div>
                                )}
                                <Badge variant="outline" className="text-xs mt-1">
                                  {appointment.status.replace("_", " ").toUpperCase()}
                                </Badge>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Briefcase className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No appointments scheduled</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Upcoming Leave Requests */}
        {leaveRequests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Leave Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {leaveRequests.map((leave) => (
                  <Card key={leave.id}>
                    <CardContent className="pt-4">
                      <div className="space-y-2">
                        <Badge
                          variant={leave.status === "approved" ? "default" : "secondary"}
                        >
                          {leave.status.toUpperCase()}
                        </Badge>
                        <div className="text-sm font-semibold">
                          {leave.leave_type.replace("_", " ").toUpperCase()}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {format(parseISO(leave.start_date), "MMM d, yyyy")} -{" "}
                          {format(parseISO(leave.end_date), "MMM d, yyyy")}
                        </div>
                        {leave.reason && (
                          <p className="text-xs text-muted-foreground italic">{leave.reason}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
