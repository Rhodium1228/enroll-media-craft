import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { Plus, Trash2, Calendar as CalendarIcon, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { detectDateAssignmentConflicts, formatConflictMessage } from "@/lib/dateAssignmentUtils";
import type { DateAssignmentConflict } from "@/lib/dateAssignmentUtils";

interface TimeSlot {
  start: string;
  end: string;
}

interface StaffDateAssignment {
  id: string;
  staff_id: string;
  branch_id: string;
  date: string;
  time_slots: TimeSlot[];
  reason: string | null;
  created_at: string;
}

interface StaffBranchDateAssignmentsProps {
  staffId: string;
  branchId: string;
  staffName: string;
}

export default function StaffBranchDateAssignments({
  staffId,
  branchId,
  staffName,
}: StaffBranchDateAssignmentsProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [assignments, setAssignments] = useState<StaffDateAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([{ start: "09:00", end: "17:00" }]);
  const [reason, setReason] = useState("");
  const [conflicts, setConflicts] = useState<DateAssignmentConflict[]>([]);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchAssignments();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('staff-date-assignments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'staff_date_assignments',
          filter: `staff_id=eq.${staffId},branch_id=eq.${branchId}`
        },
        () => {
          fetchAssignments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [staffId, branchId]);

  const fetchAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from("staff_date_assignments")
        .select("*")
        .eq("staff_id", staffId)
        .eq("branch_id", branchId)
        .order("date", { ascending: true });

      if (error) throw error;
      setAssignments((data || []) as unknown as StaffDateAssignment[]);
    } catch (error: any) {
      console.error("Error fetching assignments:", error);
    }
  };

  const checkConflicts = async (date: string, slots: TimeSlot[]): Promise<DateAssignmentConflict[]> => {
    try {
      const { data: existingAssignments, error } = await supabase
        .from("staff_date_assignments")
        .select(`
          *,
          branch:branches!staff_date_assignments_branch_id_fkey(name)
        `)
        .eq("staff_id", staffId)
        .eq("date", date)
        .neq("branch_id", branchId);

      if (error) throw error;

      // Transform data to match expected format
      const formattedAssignments = (existingAssignments || []).map((assignment: any) => ({
        branch_id: assignment.branch_id,
        branch_name: assignment.branch?.name || "Unknown Branch",
        time_slots: assignment.time_slots as TimeSlot[],
      }));

      return detectDateAssignmentConflicts(
        staffId,
        staffName,
        date,
        slots,
        formattedAssignments,
        branchId
      );
    } catch (error: any) {
      console.error("Error checking conflicts:", error);
      return [];
    }
  };

  const handleAddSlot = () => {
    setTimeSlots([...timeSlots, { start: "09:00", end: "17:00" }]);
  };

  const handleRemoveSlot = (index: number) => {
    if (timeSlots.length > 1) {
      setTimeSlots(timeSlots.filter((_, i) => i !== index));
    }
  };

  const handleSlotChange = (index: number, field: keyof TimeSlot, value: string) => {
    const updated = [...timeSlots];
    updated[index] = { ...updated[index], [field]: value };
    setTimeSlots(updated);
  };

  const handleSaveAssignment = async () => {
    if (!selectedDate) {
      toast({
        title: "Error",
        description: "Please select a date",
        variant: "destructive",
      });
      return;
    }

    const dateStr = format(selectedDate, "yyyy-MM-dd");
    
    // Check for conflicts
    const detectedConflicts = await checkConflicts(dateStr, timeSlots);
    if (detectedConflicts.length > 0) {
      setConflicts(detectedConflicts);
      setShowConflictDialog(true);
      return;
    }

    await performSave(dateStr);
  };

  const performSave = async (dateStr: string) => {
    setLoading(true);
    try {
      // Check if assignment already exists for this date
      const existing = assignments.find(a => a.date === dateStr);

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from("staff_date_assignments")
          .update({
            time_slots: timeSlots as any,
            reason: reason || null,
          })
          .eq("id", existing.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Assignment updated successfully",
        });
      } else {
        // Create new
        const { error } = await supabase
          .from("staff_date_assignments")
          .insert({
            staff_id: staffId,
            branch_id: branchId,
            date: dateStr,
            time_slots: timeSlots as any,
            reason: reason || null,
          });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Assignment created successfully",
        });
      }

      // Reset form
      setTimeSlots([{ start: "09:00", end: "17:00" }]);
      setReason("");
      setSelectedDate(undefined);
      fetchAssignments();
    } catch (error: any) {
      console.error("Error saving assignment:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save assignment",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from("staff_date_assignments")
        .delete()
        .eq("id", assignmentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Assignment deleted successfully",
      });

      fetchAssignments();
    } catch (error: any) {
      console.error("Error deleting assignment:", error);
      toast({
        title: "Error",
        description: "Failed to delete assignment",
        variant: "destructive",
      });
    }
  };

  const getAssignedDates = (): Date[] => {
    return assignments.map(a => parseISO(a.date));
  };

  const selectedDateAssignment = selectedDate
    ? assignments.find(a => a.date === format(selectedDate, "yyyy-MM-dd"))
    : null;

  // Update form when selecting a date with existing assignment
  useEffect(() => {
    if (selectedDateAssignment) {
      setTimeSlots(selectedDateAssignment.time_slots as TimeSlot[]);
      setReason(selectedDateAssignment.reason || "");
    } else {
      setTimeSlots([{ start: "09:00", end: "17:00" }]);
      setReason("");
    }
  }, [selectedDate]);

  return (
    <div className="space-y-4">
      {/* Calendar */}
      <Card>
        <CardContent className="pt-6">
          <Label className="text-sm font-medium mb-3 block">
            <CalendarIcon className="h-4 w-4 inline mr-2" />
            Select a Date to Schedule
          </Label>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className={cn("rounded-md border")}
            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
            modifiers={{
              assigned: getAssignedDates(),
            }}
            modifiersClassNames={{
              assigned: "bg-primary text-primary-foreground font-semibold",
            }}
          />
          <div className="mt-3 text-xs text-muted-foreground">
            Highlighted dates have existing assignments
          </div>
        </CardContent>
      </Card>

      {/* Assignment Form */}
      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {selectedDateAssignment ? "Edit Assignment" : "New Assignment"} - {format(selectedDate, "EEEE, MMMM d, yyyy")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Label className="text-sm">Working Hours</Label>
              {timeSlots.map((slot, index) => (
                <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                  <Input
                    type="time"
                    value={slot.start}
                    onChange={(e) => handleSlotChange(index, "start", e.target.value)}
                    className="flex-1"
                  />
                  <span className="text-muted-foreground hidden sm:inline">to</span>
                  <Input
                    type="time"
                    value={slot.end}
                    onChange={(e) => handleSlotChange(index, "end", e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveSlot(index)}
                    disabled={timeSlots.length === 1}
                    className="shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddSlot}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Time Slot
              </Button>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Reason (Optional)</Label>
              <Textarea
                placeholder="e.g., Special event, extra coverage needed"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={handleSaveAssignment}
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  selectedDateAssignment ? "Update Assignment" : "Create Assignment"
                )}
              </Button>
              {selectedDateAssignment && (
                <Button
                  variant="destructive"
                  onClick={() => handleDeleteAssignment(selectedDateAssignment.id)}
                  className="flex-1 sm:flex-none"
                >
                  <Trash2 className="h-4 w-4 sm:mr-2" />
                  <span className="sm:inline">Delete</span>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Assignments List */}
      {assignments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Scheduled Dates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                  onClick={() => setSelectedDate(parseISO(assignment.date))}
                >
                  <div className="space-y-1">
                    <div className="font-medium text-sm">
                      {format(parseISO(assignment.date), "EEEE, MMM d, yyyy")}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(assignment.time_slots as TimeSlot[]).map((slot, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {slot.start} - {slot.end}
                        </Badge>
                      ))}
                    </div>
                    {assignment.reason && (
                      <div className="text-xs text-muted-foreground">{assignment.reason}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conflict Warning Dialog */}
      <AlertDialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Schedule Conflict Detected
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <Alert variant="destructive">
                  <AlertDescription>
                    {formatConflictMessage(conflicts)}
                  </AlertDescription>
                </Alert>
                <p className="text-sm">
                  This assignment overlaps with existing assignments at other branches. Do you want to proceed anyway?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowConflictDialog(false);
                if (selectedDate) {
                  performSave(format(selectedDate, "yyyy-MM-dd"));
                }
              }}
              className="w-full sm:w-auto bg-destructive hover:bg-destructive/90"
            >
              Proceed Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

