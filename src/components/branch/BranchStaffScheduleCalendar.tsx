import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { DateStaffAssignmentForm } from "./DateStaffAssignmentForm";
import { Users, Edit, Trash2, AlertCircle, Calendar as CalendarIcon, Plus } from "lucide-react";
import { AppointmentDialog } from "../appointments/AppointmentDialog";
import { AppointmentCard } from "../appointments/AppointmentCard";
import { AppointmentWithDetails } from "@/lib/appointmentUtils";
import {
  StaffDateAssignment,
  TimeSlot,
  detectDateAssignmentConflicts,
  formatConflictMessage,
} from "@/lib/dateAssignmentUtils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Staff {
  id: string;
  first_name: string;
  last_name: string;
}

interface BranchStaffScheduleCalendarProps {
  branchId: string;
  branchName: string;
}

export function BranchStaffScheduleCalendar({
  branchId,
  branchName,
}: BranchStaffScheduleCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [assignments, setAssignments] = useState<StaffDateAssignment[]>([]);
  const [availableStaff, setAvailableStaff] = useState<Staff[]>([]);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [conflictWarning, setConflictWarning] = useState<string>("");
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [pendingAssignment, setPendingAssignment] = useState<{
    staffId: string;
    timeSlots: TimeSlot[];
    reason?: string;
  } | null>(null);
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
  const [showAppointmentDialog, setShowAppointmentDialog] = useState(false);
  const [selectedStaffForTask, setSelectedStaffForTask] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch assignments for the branch
  useEffect(() => {
    fetchAssignments();
    fetchAvailableStaff();
    if (selectedDate) {
      fetchAppointments();
    }
    
    // Set up realtime subscription
    const channel = supabase
      .channel('staff-assignment-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'staff_date_assignments',
          filter: `branch_id=eq.${branchId}`,
        },
        (payload) => {
          console.log('Staff assignment change detected:', payload);
          fetchAssignments();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `branch_id=eq.${branchId}`,
        },
        () => {
          if (selectedDate) {
            fetchAppointments();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [branchId]);

  useEffect(() => {
    if (selectedDate) {
      fetchAppointments();
    }
  }, [selectedDate]);

  const fetchAssignments = async () => {
    const { data, error } = await supabase
      .from("staff_date_assignments")
      .select(`
        *,
        staff:staff_id (
          id,
          first_name,
          last_name
        )
      `)
      .eq("branch_id", branchId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch staff assignments",
        variant: "destructive",
      });
      return;
    }

    setAssignments((data || []) as any);
  };

  const fetchAvailableStaff = async () => {
    const { data, error } = await supabase
      .from("staff_branches")
      .select("staff:staff_id(id, first_name, last_name)")
      .eq("branch_id", branchId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch available staff",
        variant: "destructive",
      });
      return;
    }

    const staffList = data?.map((item: any) => item.staff).filter(Boolean) || [];
    setAvailableStaff(staffList);
  };

  const fetchAppointments = async () => {
    if (!selectedDate) return;
    
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const { data } = await supabase
      .from("appointments")
      .select(`
        *,
        staff:staff_id (id, first_name, last_name, profile_image_url),
        service:service_id (id, title, duration, cost),
        branch:branch_id (id, name)
      `)
      .eq("branch_id", branchId)
      .eq("date", dateStr)
      .order("start_time");

    setAppointments((data as any) || []);
  };

  const checkConflicts = async (
    staffId: string,
    date: string,
    timeSlots: TimeSlot[]
  ) => {
    // Get staff info
    const staff = availableStaff.find((s) => s.id === staffId);
    if (!staff) return [];

    // Fetch existing assignments for this staff on this date at other branches
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
      .eq("date", date)
      .neq("branch_id", branchId);

    if (error || !data) return [];

    const existingAssignments = data.map((assignment: any) => ({
      branch_id: assignment.branch.id,
      branch_name: assignment.branch.name,
      time_slots: assignment.time_slots,
    }));

    return detectDateAssignmentConflicts(
      staffId,
      `${staff.first_name} ${staff.last_name}`,
      date,
      timeSlots,
      existingAssignments,
      branchId
    );
  };

  const handleAssignStaff = async (
    staffId: string,
    timeSlots: TimeSlot[],
    reason?: string
  ) => {
    if (!selectedDate) return;

    const dateStr = format(selectedDate, "yyyy-MM-dd");
    
    // Check for conflicts
    const conflicts = await checkConflicts(staffId, dateStr, timeSlots);

    if (conflicts.length > 0) {
      const conflictMsg = formatConflictMessage(conflicts);
      setConflictWarning(conflictMsg);
      setPendingAssignment({ staffId, timeSlots, reason });
      setShowConflictDialog(true);
      return;
    }

    await saveAssignment(staffId, dateStr, timeSlots, reason);
  };

  const saveAssignment = async (
    staffId: string,
    date: string,
    timeSlots: TimeSlot[],
    reason?: string
  ) => {
    setIsLoading(true);

    const { error } = await supabase.from("staff_date_assignments").insert({
      staff_id: staffId,
      branch_id: branchId,
      date,
      time_slots: timeSlots as any,
      reason,
    });

    setIsLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to assign staff",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Staff assigned successfully",
    });

    setShowAssignmentForm(false);
    setPendingAssignment(null);
    fetchAssignments();
  };

  const handleConfirmWithConflict = () => {
    if (pendingAssignment && selectedDate) {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      saveAssignment(
        pendingAssignment.staffId,
        dateStr,
        pendingAssignment.timeSlots,
        pendingAssignment.reason
      );
    }
    setShowConflictDialog(false);
    setConflictWarning("");
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    const { error } = await supabase
      .from("staff_date_assignments")
      .delete()
      .eq("id", assignmentId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete assignment",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Assignment deleted",
    });

    fetchAssignments();
  };

  // Get assignments for selected date
  const selectedDateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";
  const selectedDateAssignments = assignments.filter(
    (a) => a.date === selectedDateStr
  );

  // Get dates with assignments for calendar highlights
  const datesWithAssignments = assignments.map((a) => parseISO(a.date));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Staff Schedule Calendar
          </CardTitle>
        </CardHeader>
      <CardContent className="space-y-6 p-3 sm:p-6">
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
          {/* Calendar */}
          <div className="flex-1 w-full">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border w-full"
              modifiers={{
                hasAssignments: datesWithAssignments,
              }}
              modifiersClassNames={{
                hasAssignments: "bg-primary/10 font-semibold",
              }}
            />
          </div>

          {/* Selected Date Details */}
          <div className="flex-1 space-y-4">
            {selectedDate ? (
              <>
                <div>
                  <h3 className="font-semibold text-lg">
                    {format(selectedDate, "EEEE, MMMM d, yyyy")}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedDateAssignments.length} staff assigned
                  </p>
                </div>

                <Separator />

                 {selectedDateAssignments.length > 0 ? (
                  <div className="space-y-3">
                    {selectedDateAssignments.map((assignment: any) => {
                      const staffAppointments = appointments.filter(
                        apt => apt.staff_id === assignment.staff_id
                      );
                      
                      return (
                        <Card key={assignment.id} className="overflow-hidden">
                          <CardContent className="p-3 sm:p-4">
                            <div className="flex flex-col gap-3">
                              {/* Staff Header */}
                              <div className="flex justify-between items-start gap-3">
                                <div className="space-y-1 flex-1">
                                  <p className="font-medium">
                                    {assignment.staff.first_name}{" "}
                                    {assignment.staff.last_name}
                                  </p>
                                  <div className="space-y-1">
                                    {assignment.time_slots.map(
                                      (slot: TimeSlot, idx: number) => (
                                        <p
                                          key={idx}
                                          className="text-sm text-muted-foreground"
                                        >
                                          {slot.start} - {slot.end}
                                        </p>
                                      )
                                    )}
                                  </div>
                                  {assignment.reason && (
                                    <Badge variant="outline" className="mt-2">
                                      {assignment.reason}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedStaffForTask(assignment.staff_id);
                                      setShowAppointmentDialog(true);
                                    }}
                                  >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Assign Task
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      handleDeleteAssignment(assignment.id)
                                    }
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>

                              {/* Staff Tasks */}
                              {staffAppointments.length > 0 && (
                                <div className="pl-3 border-l-2 border-primary/30 space-y-2">
                                  <p className="text-xs font-medium text-muted-foreground">
                                    Assigned Tasks ({staffAppointments.length})
                                  </p>
                                  <div className="space-y-2">
                                    {staffAppointments.map((apt) => (
                                      <div
                                        key={apt.id}
                                        className="text-sm p-2 bg-accent/50 rounded border"
                                      >
                                        <div className="flex justify-between items-start">
                                          <div className="flex-1">
                                            <p className="font-medium">
                                              {apt.customer_name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                              {apt.start_time} - {apt.service?.title}
                                            </p>
                                            {apt.customer_phone && (
                                              <p className="text-xs text-muted-foreground">
                                                {apt.customer_phone}
                                              </p>
                                            )}
                                          </div>
                                          <Badge
                                            variant={
                                              apt.status === "completed"
                                                ? "default"
                                                : apt.status === "cancelled"
                                                ? "destructive"
                                                : "secondary"
                                            }
                                            className="text-xs"
                                          >
                                            {apt.status}
                                          </Badge>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                 ) : (
                   <p className="text-sm text-muted-foreground text-center py-8">
                     No staff assigned for this date
                   </p>
                 )}

                 <Separator className="my-4" />

                 {!showAssignmentForm ? (
                   <Button
                     onClick={() => setShowAssignmentForm(true)}
                     className="w-full"
                   >
                     <Users className="h-4 w-4 mr-2" />
                     Assign Staff to This Date
                   </Button>
                 ) : (
                   <div className="border rounded-lg p-4">
                     <DateStaffAssignmentForm
                       availableStaff={availableStaff}
                       onSubmit={handleAssignStaff}
                       onCancel={() => setShowAssignmentForm(false)}
                       isLoading={isLoading}
                     />
                   </div>
                 )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Select a date to view or add assignments
              </p>
            )}
          </div>
        </div>
      </CardContent>
      </Card>

      <AppointmentDialog
        open={showAppointmentDialog}
        onOpenChange={(open) => {
          setShowAppointmentDialog(open);
          if (!open) setSelectedStaffForTask(null);
        }}
        prefilledBranchId={branchId}
        prefilledDate={selectedDate}
        prefilledStaffId={selectedStaffForTask || undefined}
        onSuccess={() => {
          fetchAppointments();
          setShowAppointmentDialog(false);
          setSelectedStaffForTask(null);
          toast({
            title: "Success",
            description: "Task assigned successfully",
          });
        }}
      />

      {/* Conflict Warning Dialog */}
      <AlertDialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
        <AlertDialogContent className="max-w-[95vw] sm:max-w-lg mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Schedule Conflict Detected
            </AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-line text-sm">
              {conflictWarning}
              {"\n\n"}
              Do you want to proceed with this assignment anyway?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={() => {
              setShowConflictDialog(false);
              setConflictWarning("");
              setPendingAssignment(null);
            }} className="w-full sm:w-auto">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmWithConflict} className="w-full sm:w-auto">
              Proceed Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
