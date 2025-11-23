import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowLeft, Calendar as CalendarIcon, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { detectScheduleConflicts } from "@/lib/scheduleConflicts";
import type { ScheduleConflict } from "@/lib/scheduleConflicts";
import MonthCalendar from "@/components/calendar/MonthCalendar";
import DayDetailDialog from "@/components/calendar/DayDetailDialog";
import DraggableScheduleBlock from "@/components/calendar/DraggableScheduleBlock";
import DroppableDayCell from "@/components/calendar/DroppableDayCell";

interface Staff {
  id: string;
  first_name: string;
  last_name: string;
  profile_image_url: string | null;
}

interface Branch {
  id: string;
  name: string;
}

interface StaffSchedule {
  staff: Staff;
  branch: Branch;
  working_hours: any;
  branch_color: string;
  overrides?: any[];
  leave_requests?: any[];
}

const BRANCH_COLORS = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-green-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-teal-500",
  "bg-indigo-500",
  "bg-amber-500",
];

const DAYS = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
];

const TIME_SLOTS = Array.from({ length: 15 }, (_, i) => {
  const hour = i + 7; // 7 AM to 9 PM
  return `${hour.toString().padStart(2, "0")}:00`;
});

export default function StaffCalendar() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<StaffSchedule[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string>("all");
  const [allStaff, setAllStaff] = useState<Staff[]>([]);
  const [conflicts, setConflicts] = useState<Map<string, ScheduleConflict[]>>(new Map());
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dayDialogOpen, setDayDialogOpen] = useState(false);
  const [dragConflicts, setDragConflicts] = useState<ScheduleConflict[]>([]);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [pendingDrop, setPendingDrop] = useState<{
    dragData: any;
    targetDay: string;
  } | null>(null);

  useEffect(() => {
    fetchSchedules();
  }, []);

  useEffect(() => {
    if (schedules.length > 0) {
      detectAllConflicts();
    }
  }, [schedules]);

  const fetchSchedules = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/");
        return;
      }

      // Fetch all staff schedules
      const { data, error } = await supabase
        .from("staff_branches")
        .select(`
          staff_id,
          branch_id,
          working_hours,
          staff:staff_id (
            id,
            first_name,
            last_name,
            profile_image_url
          ),
          branches:branch_id (
            id,
            name,
            created_by
          )
        `)
        .eq("branches.created_by", user.id);

      if (error) throw error;

      // Fetch schedule overrides
      const { data: overridesData } = await supabase
        .from("staff_schedule_overrides")
        .select("*");

      // Fetch leave requests
      const { data: leaveData } = await supabase
        .from("staff_leave_requests")
        .select("*")
        .eq("status", "approved");

      // Extract unique staff
      const uniqueStaff = Array.from(
        new Map(
          data
            ?.filter((item: any) => item.staff)
            .map((item: any) => [item.staff.id, item.staff])
        ).values()
      );
      setAllStaff(uniqueStaff as Staff[]);

      // Assign colors to branches
      const branchColorMap = new Map<string, string>();
      let colorIndex = 0;

      const schedulesData = (data || [])
        .filter((item: any) => item.staff && item.branches)
        .map((item: any) => {
          if (!branchColorMap.has(item.branch_id)) {
            branchColorMap.set(item.branch_id, BRANCH_COLORS[colorIndex % BRANCH_COLORS.length]);
            colorIndex++;
          }

          // Filter overrides and leave for this staff-branch combination
          const staffOverrides = (overridesData || []).filter(
            (o: any) => o.staff_id === item.staff_id && o.branch_id === item.branch_id
          );
          
          const staffLeave = (leaveData || []).filter(
            (l: any) => l.staff_id === item.staff_id
          );

          return {
            staff: item.staff,
            branch: item.branches,
            working_hours: item.working_hours,
            branch_color: branchColorMap.get(item.branch_id)!,
            overrides: staffOverrides,
            leave_requests: staffLeave,
          };
        });

      setSchedules(schedulesData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const detectAllConflicts = () => {
    const conflictMap = new Map<string, ScheduleConflict[]>();

    // Group schedules by staff
    const staffSchedulesMap = new Map<string, StaffSchedule[]>();
    schedules.forEach((schedule) => {
      const staffId = schedule.staff.id;
      if (!staffSchedulesMap.has(staffId)) {
        staffSchedulesMap.set(staffId, []);
      }
      staffSchedulesMap.get(staffId)!.push(schedule);
    });

    // Check conflicts for each staff member
    staffSchedulesMap.forEach((staffSchedules, staffId) => {
      if (staffSchedules.length < 2) return; // No conflicts if only at one branch

      staffSchedules.forEach((schedule) => {
        const otherSchedules = staffSchedules
          .filter((s) => s.branch.id !== schedule.branch.id)
          .map((s) => ({
            branch_id: s.branch.id,
            branch_name: s.branch.name,
            working_hours: s.working_hours,
          }));

        const staffConflicts = detectScheduleConflicts(
          schedule.working_hours,
          otherSchedules,
          schedule.branch.id
        );

        if (staffConflicts.length > 0) {
          const key = `${staffId}-${schedule.branch.id}`;
          conflictMap.set(key, staffConflicts);
        }
      });
    });

    setConflicts(conflictMap);
  };

  const getScheduleForDay = (schedule: StaffSchedule, day: string) => {
    const daySchedule = schedule.working_hours[day];
    if (!daySchedule || daySchedule.closed || !daySchedule.slots) return null;
    return daySchedule.slots;
  };

  const hasConflict = (staffId: string, branchId: string, day: string) => {
    const key = `${staffId}-${branchId}`;
    const staffConflicts = conflicts.get(key) || [];
    return staffConflicts.some((c) => c.day === day);
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setDayDialogOpen(true);
  };

  const handleScheduleUpdate = () => {
    fetchSchedules();
  };

  const handleDrop = async (dragData: any, targetDay: string) => {
    // If dropping on the same day, do nothing
    if (dragData.sourceDay === targetDay) {
      return;
    }

    // Check for conflicts before committing
    const staffSchedule = schedules.find(
      (s) => s.staff.id === dragData.staffId && s.branch.id === dragData.branchId
    );

    if (!staffSchedule) return;

    // Create a hypothetical new schedule with the moved slot
    const newWorkingHours = { ...staffSchedule.working_hours };
    
    // Remove from source day
    const sourceDaySchedule = newWorkingHours[dragData.sourceDay] || { slots: [] };
    const updatedSourceSlots = sourceDaySchedule.slots?.filter(
      (s: any) => !(s.start === dragData.slot.start && s.end === dragData.slot.end)
    ) || [];
    
    newWorkingHours[dragData.sourceDay] = {
      closed: updatedSourceSlots.length === 0,
      slots: updatedSourceSlots,
    };

    // Add to target day
    const targetDaySchedule = newWorkingHours[targetDay] || { slots: [] };
    const updatedTargetSlots = [...(targetDaySchedule.slots || []), dragData.slot];
    
    newWorkingHours[targetDay] = {
      closed: false,
      slots: updatedTargetSlots,
    };

    // Check for conflicts with other branches
    const otherSchedules = schedules
      .filter((s) => s.staff.id === dragData.staffId && s.branch.id !== dragData.branchId)
      .map((s) => ({
        branch_id: s.branch.id,
        branch_name: s.branch.name,
        working_hours: s.working_hours,
      }));

    const conflicts = detectScheduleConflicts(
      newWorkingHours,
      otherSchedules,
      dragData.branchId
    );

    // Filter conflicts to only show those affecting the target day
    const targetDayConflicts = conflicts.filter((c) => c.day === targetDay);

    if (targetDayConflicts.length > 0) {
      // Show conflict warning
      setDragConflicts(targetDayConflicts);
      setPendingDrop({ dragData, targetDay });
      setShowConflictDialog(true);
    } else {
      // No conflicts, proceed with the move
      await performScheduleMove(dragData, targetDay, newWorkingHours);
    }
  };

  const performScheduleMove = async (
    dragData: any,
    targetDay: string,
    newWorkingHours: any
  ) => {
    try {
      const { error } = await supabase
        .from("staff_branches")
        .update({ working_hours: newWorkingHours })
        .eq("staff_id", dragData.staffId)
        .eq("branch_id", dragData.branchId);

      if (error) throw error;

      toast({
        title: "Schedule Updated",
        description: `Moved ${dragData.staffName}'s shift from ${dragData.sourceDay} to ${targetDay}`,
      });

      fetchSchedules();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleConflictConfirm = async () => {
    if (!pendingDrop) return;

    const staffSchedule = schedules.find(
      (s) => s.staff.id === pendingDrop.dragData.staffId && s.branch.id === pendingDrop.dragData.branchId
    );

    if (!staffSchedule) return;

    // Recreate the new working hours
    const newWorkingHours = { ...staffSchedule.working_hours };
    
    const sourceDaySchedule = newWorkingHours[pendingDrop.dragData.sourceDay] || { slots: [] };
    const updatedSourceSlots = sourceDaySchedule.slots?.filter(
      (s: any) => !(s.start === pendingDrop.dragData.slot.start && s.end === pendingDrop.dragData.slot.end)
    ) || [];
    
    newWorkingHours[pendingDrop.dragData.sourceDay] = {
      closed: updatedSourceSlots.length === 0,
      slots: updatedSourceSlots,
    };

    const targetDaySchedule = newWorkingHours[pendingDrop.targetDay] || { slots: [] };
    const updatedTargetSlots = [...(targetDaySchedule.slots || []), pendingDrop.dragData.slot];
    
    newWorkingHours[pendingDrop.targetDay] = {
      closed: false,
      slots: updatedTargetSlots,
    };

    await performScheduleMove(pendingDrop.dragData, pendingDrop.targetDay, newWorkingHours);
    
    setShowConflictDialog(false);
    setPendingDrop(null);
    setDragConflicts([]);
  };

  const filteredSchedules =
    selectedStaff === "all"
      ? schedules
      : schedules.filter((s) => s.staff.id === selectedStaff);

  // Group by staff for better display
  const groupedByStaff = new Map<string, StaffSchedule[]>();
  filteredSchedules.forEach((schedule) => {
    const staffId = schedule.staff.id;
    if (!groupedByStaff.has(staffId)) {
      groupedByStaff.set(staffId, []);
    }
    groupedByStaff.get(staffId)!.push(schedule);
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-foreground flex items-center gap-3">
                <CalendarIcon className="h-10 w-10 text-primary" />
                Staff Calendar
              </h1>
              <p className="text-muted-foreground mt-2">
                {viewMode === "week" 
                  ? "Drag and drop schedule blocks to reschedule staff between days"
                  : "Monthly calendar with staff availability"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "week" | "month")}>
                <TabsList>
                  <TabsTrigger value="week">Week View</TabsTrigger>
                  <TabsTrigger value="month">Month View</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="w-64">
                <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by staff" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Staff</SelectItem>
                    {allStaff.map((staff) => (
                      <SelectItem key={staff.id} value={staff.id}>
                        {staff.first_name} {staff.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {conflicts.size > 0 && (
            <Card className="border-destructive mb-6 animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  {conflicts.size} Schedule Conflict{conflicts.size > 1 ? "s" : ""} Detected
                </CardTitle>
                <CardDescription>
                  Red highlighted blocks indicate overlapping schedules across different branches
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>

        {viewMode === "month" ? (
          <MonthCalendar
            schedules={filteredSchedules}
            conflicts={conflicts}
            onDayClick={handleDayClick}
          />
        ) : (
          groupedByStaff.size === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <CalendarIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No schedules found</h3>
                  <p className="text-muted-foreground">
                    Start by enrolling staff members to your branches
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
          <div className="space-y-8">
            {Array.from(groupedByStaff.entries()).map(([staffId, staffSchedules]) => {
              const staff = staffSchedules[0].staff;
              return (
                <Card key={staffId} className="animate-fade-in">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      {staff.profile_image_url ? (
                        <img
                          src={staff.profile_image_url}
                          alt={`${staff.first_name} ${staff.last_name}`}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-lg font-semibold">
                          {staff.first_name[0]}
                          {staff.last_name[0]}
                        </div>
                      )}
                      <div>
                        <CardTitle>
                          {staff.first_name} {staff.last_name}
                        </CardTitle>
                        <CardDescription>
                          Working at {staffSchedules.length} branch{staffSchedules.length > 1 ? "es" : ""}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <div className="min-w-[800px]">
                        {/* Calendar Header */}
                        <div className="grid grid-cols-8 gap-2 mb-2">
                          <div className="font-semibold text-sm text-muted-foreground"></div>
                          {DAYS.map((day) => (
                            <div
                              key={day.key}
                              className="font-semibold text-sm text-center text-foreground"
                            >
                              {day.label}
                            </div>
                          ))}
                        </div>

                        {/* Schedule Grid */}
                        {staffSchedules.map((schedule) => (
                          <div key={schedule.branch.id} className="mb-4">
                            <div className="grid grid-cols-8 gap-2 items-start">
                              <div className="pr-2">
                                <Badge className={`${schedule.branch_color} text-white text-xs`}>
                                  {schedule.branch.name}
                                </Badge>
                              </div>
                              {DAYS.map((day) => {
                                const slots = getScheduleForDay(schedule, day.key);
                                const hasConflictOnDay = hasConflict(
                                  staff.id,
                                  schedule.branch.id,
                                  day.key
                                );

                                return (
                                  <DroppableDayCell
                                    key={day.key}
                                    day={day.key}
                                    onDrop={handleDrop}
                                    className={
                                      hasConflictOnDay
                                        ? "border-destructive bg-destructive/10"
                                        : ""
                                    }
                                  >
                                    {slots ? (
                                      <div className="space-y-1">
                                         {slots.map((slot: any, idx: number) => (
                                          <DraggableScheduleBlock
                                            key={idx}
                                            staffId={staff.id}
                                            staffName={`${staff.first_name} ${staff.last_name}`}
                                            branchId={schedule.branch.id}
                                            branchName={schedule.branch.name}
                                            branchColor={schedule.branch_color}
                                            day={day.key}
                                            slot={slot}
                                            hasConflict={hasConflictOnDay}
                                            workingHours={schedule.working_hours}
                                            overrides={schedule.overrides}
                                            leaveRequests={schedule.leave_requests}
                                          />
                                        ))}
                                        {hasConflictOnDay && (
                                          <div className="flex items-center gap-1 text-xs text-destructive font-semibold mt-1">
                                            <AlertTriangle className="h-3 w-3" />
                                            Conflict
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="text-xs text-muted-foreground text-center">
                                        Off
                                      </div>
                                    )}
                                  </DroppableDayCell>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          )
        )}

        <DayDetailDialog
          open={dayDialogOpen}
          onOpenChange={setDayDialogOpen}
          date={selectedDate}
          schedules={schedules}
          conflicts={conflicts}
          onScheduleUpdate={handleScheduleUpdate}
        />

        <AlertDialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Schedule Conflict Detected
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div>
                  <p className="mb-3">
                    Moving this schedule will create a conflict with an existing assignment:
                  </p>
                  <Card className="mb-4">
                    <CardContent className="pt-4 text-sm space-y-2">
                      {dragConflicts.map((conflict, idx) => (
                        <div key={idx} className="border-l-2 border-destructive pl-3">
                          <p className="font-semibold capitalize">{conflict.day}:</p>
                          <p className="text-muted-foreground">
                            Conflicts with schedule at <span className="font-medium">{conflict.branch_name}</span>
                          </p>
                          {conflict.conflicting_slots.map((slot, slotIdx) => (
                            <div key={slotIdx} className="text-xs ml-2 text-muted-foreground">
                              {slot.new.start}-{slot.new.end} ↔ {slot.existing.start}-{slot.existing.end}
                            </div>
                          ))}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                  <p className="text-sm">
                    Do you want to proceed anyway? The staff member will be scheduled at both locations during the overlapping times.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setShowConflictDialog(false);
                setPendingDrop(null);
                setDragConflicts([]);
              }}>
                Cancel Move
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConflictConfirm}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Proceed Anyway
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Legend */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg">Legend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Branch Colors */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Branches</h4>
                <div className="flex flex-wrap gap-4">
                  {schedules
                    .reduce((acc, schedule) => {
                      if (!acc.find((b) => b.id === schedule.branch.id)) {
                        acc.push({
                          id: schedule.branch.id,
                          name: schedule.branch.name,
                          color: schedule.branch_color,
                        });
                      }
                      return acc;
                    }, [] as Array<{ id: string; name: string; color: string }>)
                    .map((branch) => (
                      <div key={branch.id} className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded ${branch.color}`}></div>
                        <span className="text-sm">{branch.name}</span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Schedule Types */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Schedule Types</h4>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <span>🟢</span>
                    <span className="text-sm">Regular Schedule</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>🟡</span>
                    <span className="text-sm">Custom Hours</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>🔴</span>
                    <span className="text-sm">Unavailable / Leave</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>⚪</span>
                    <span className="text-sm">Closed / Not Scheduled</span>
                  </div>
                </div>
              </div>

              {/* Other Indicators */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Other Indicators</h4>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded border-2 border-destructive bg-destructive/10"></div>
                    <span className="text-sm">Schedule Conflict</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-muted border-2 border-primary flex items-center justify-center">
                      <span className="text-[8px]">⋮⋮</span>
                    </div>
                    <span className="text-sm">Draggable (Week View)</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
