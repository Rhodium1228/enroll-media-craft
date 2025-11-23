import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, addDays, isWeekend, isBefore, startOfDay } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X, Save, Plus, Edit2, Trash2, CheckSquare, Square, Sparkles, Users, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { detectDateAssignmentConflicts, formatConflictMessage } from "@/lib/dateAssignmentUtils";
import type { TimeSlot as StaffTimeSlot } from "@/lib/dateAssignmentUtils";

interface BranchOverride {
  id: string;
  date: string;
  override_type: string;
  time_slots: any[];
  reason: string | null;
}

interface TimeSlot {
  open: string;
  close: string;
}

interface Staff {
  id: string;
  first_name: string;
  last_name: string;
}

interface StaffAssignment {
  id: string;
  staff_id: string;
  date: string;
  time_slots: StaffTimeSlot[];
  reason: string | null;
  staff: Staff;
}

interface BranchHoursCalendarProps {
  branchId: string;
  refreshTrigger?: number;
}

export function BranchHoursCalendar({ branchId, refreshTrigger }: BranchHoursCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [overrides, setOverrides] = useState<BranchOverride[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // Multi-select state
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  
  // Edit form state
  const [overrideType, setOverrideType] = useState<string>("closed");
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([{ open: "09:00", close: "17:00" }]);
  const [reason, setReason] = useState("");

  // Staff assignment state
  const [availableStaff, setAvailableStaff] = useState<Staff[]>([]);
  const [staffAssignments, setStaffAssignments] = useState<StaffAssignment[]>([]);
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [staffTimeSlots, setStaffTimeSlots] = useState<StaffTimeSlot[]>([{ start: "09:00", end: "17:00" }]);
  const [staffReason, setStaffReason] = useState("");
  const [conflictWarning, setConflictWarning] = useState<string>("");
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [pendingStaffAssignment, setPendingStaffAssignment] = useState<{
    staffId: string;
    timeSlots: StaffTimeSlot[];
    reason?: string;
  } | null>(null);

  useEffect(() => {
    fetchOverrides();
    fetchAvailableStaff();
    fetchStaffAssignments();
    
    // Set up realtime subscription for staff assignments
    const staffChannel = supabase
      .channel('branch-staff-assignments')
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
          fetchStaffAssignments();
        }
      )
      .subscribe();

    // Set up realtime subscription for branch schedule overrides
    const overridesChannel = supabase
      .channel('branch-overrides-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'branch_schedule_overrides',
          filter: `branch_id=eq.${branchId}`,
        },
        (payload) => {
          console.log('Branch override change detected:', payload);
          fetchOverrides();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(staffChannel);
      supabase.removeChannel(overridesChannel);
    };
  }, [branchId, refreshTrigger]);

  const fetchOverrides = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("branch_schedule_overrides")
        .select("*")
        .eq("branch_id", branchId);

      if (error) throw error;
      setOverrides((data || []).map(item => ({
        ...item,
        time_slots: (item.time_slots as any) || []
      })));
    } catch (error: any) {
      console.error("Error fetching overrides:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableStaff = async () => {
    try {
      const { data, error } = await supabase
        .from("staff_branches")
        .select("staff:staff_id(id, first_name, last_name)")
        .eq("branch_id", branchId);

      if (error) throw error;
      const staffList = data?.map((item: any) => item.staff).filter(Boolean) || [];
      setAvailableStaff(staffList);
    } catch (error: any) {
      console.error("Error fetching staff:", error);
    }
  };

  const fetchStaffAssignments = async () => {
    try {
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

      if (error) throw error;
      setStaffAssignments((data || []) as any);
    } catch (error: any) {
      console.error("Error fetching staff assignments:", error);
    }
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get the day of week for the first day (0 = Sunday, 1 = Monday, etc.)
  const firstDayOfWeek = monthStart.getDay();
  
  // Add empty cells for days before month starts
  const emptyDays = Array(firstDayOfWeek).fill(null);
  
  const allDays = [...emptyDays, ...daysInMonth];

  const getOverrideForDate = (date: Date): BranchOverride | undefined => {
    const dateStr = format(date, "yyyy-MM-dd");
    return overrides.find(o => o.date === dateStr);
  };

  const getDateColor = (date: Date): string => {
    const override = getOverrideForDate(date);
    if (!override) return "bg-green-500/10 border-green-500/20"; // Regular hours
    
    if (override.override_type === "closed") {
      return "bg-red-500/10 border-red-500/20"; // Closed
    }
    
    return "bg-yellow-500/10 border-yellow-500/20"; // Custom hours
  };

  const getDateIndicator = (date: Date): React.ReactNode => {
    const override = getOverrideForDate(date);
    const dateStr = format(date, "yyyy-MM-dd");
    const staffCount = staffAssignments.filter(a => a.date === dateStr).length;
    
    if (!override && staffCount === 0) return "🟢";
    
    return (
      <div className="flex flex-col items-center gap-0.5">
        {override ? (
          <span className="text-[10px]">{override.override_type === "closed" ? "🔴" : "🟡"}</span>
        ) : (
          <span className="text-[10px]">🟢</span>
        )}
        {staffCount > 0 && (
          <span className="text-[8px] font-bold text-primary">{staffCount}</span>
        )}
      </div>
    );
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
    setSelectedDate(null);
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
    setSelectedDate(null);
  };

  const handleDateClick = (date: Date) => {
    if (isMultiSelectMode) {
      // Multi-select mode - toggle date in selection
      const isSelected = selectedDates.some(d => isSameDay(d, date));
      if (isSelected) {
        setSelectedDates(selectedDates.filter(d => !isSameDay(d, date)));
      } else {
        setSelectedDates([...selectedDates, date]);
      }
      return;
    }

    // Single select mode
    if (isSameDay(date, selectedDate || new Date("1900-01-01"))) {
      // Clicking same date - toggle edit mode
      if (isEditing) {
        setIsEditing(false);
        resetForm();
      } else {
        setIsEditing(true);
        loadOverrideIntoForm(getOverrideForDate(date));
      }
    } else {
      // Clicking different date
      setSelectedDate(date);
      setIsEditing(true);
      loadOverrideIntoForm(getOverrideForDate(date));
    }
  };

  const toggleMultiSelectMode = () => {
    setIsMultiSelectMode(!isMultiSelectMode);
    setSelectedDates([]);
    setIsEditing(false);
    setSelectedDate(null);
    resetForm();
  };

  const clearSelection = () => {
    setSelectedDates([]);
  };

  const isDateSelected = (date: Date): boolean => {
    return selectedDates.some(d => isSameDay(d, date));
  };

  const selectAllWeekends = () => {
    const weekendDates = daysInMonth.filter(day => isWeekend(day));
    // Add weekends that aren't already selected
    const newSelections = weekendDates.filter(day => !isDateSelected(day));
    setSelectedDates([...selectedDates, ...newSelections]);
    toast.success(`Added ${newSelections.length} weekend date(s) to selection`);
  };

  const selectNext7Days = () => {
    const today = startOfDay(new Date());
    const next7Days = Array.from({ length: 7 }, (_, i) => addDays(today, i))
      .filter(day => !isBefore(day, today)); // Only future or today
    // Add dates that aren't already selected
    const newSelections = next7Days.filter(day => !isDateSelected(day));
    setSelectedDates([...selectedDates, ...newSelections]);
    toast.success(`Added ${newSelections.length} date(s) to selection`);
  };

  const selectThisMonth = () => {
    // Add all days in current month that aren't already selected
    const newSelections = daysInMonth.filter(day => !isDateSelected(day));
    setSelectedDates([...selectedDates, ...newSelections]);
    toast.success(`Added ${newSelections.length} date(s) to selection`);
  };

  const loadOverrideIntoForm = (override: BranchOverride | undefined) => {
    if (override) {
      setOverrideType(override.override_type);
      setTimeSlots(override.time_slots.length > 0 ? override.time_slots : [{ open: "09:00", close: "17:00" }]);
      setReason(override.reason || "");
    } else {
      resetForm();
    }
  };

  const resetForm = () => {
    setOverrideType("closed");
    setTimeSlots([{ open: "09:00", close: "17:00" }]);
    setReason("");
  };

  const addTimeSlot = () => {
    setTimeSlots([...timeSlots, { open: "09:00", close: "17:00" }]);
  };

  const removeTimeSlot = (index: number) => {
    setTimeSlots(timeSlots.filter((_, i) => i !== index));
  };

  const updateTimeSlot = (index: number, field: "open" | "close", value: string) => {
    const updated = [...timeSlots];
    updated[index][field] = value;
    setTimeSlots(updated);
  };

  const handleSave = async () => {
    if (!selectedDate) return;

    if (overrideType === "custom_hours" && timeSlots.length === 0) {
      toast.error("Please add at least one time slot for custom hours");
      return;
    }

    // Validate time slots
    for (const slot of timeSlots) {
      if (slot.open >= slot.close) {
        toast.error("Closing time must be after opening time");
        return;
      }
    }

    setIsSaving(true);

    try {
      const overrideData = {
        branch_id: branchId,
        date: format(selectedDate, "yyyy-MM-dd"),
        override_type: overrideType,
        time_slots: (overrideType === "custom_hours" ? timeSlots : []) as any,
        reason: reason.trim() || null,
      };

      const existingOverride = getOverrideForDate(selectedDate);

      if (existingOverride) {
        const { error } = await supabase
          .from("branch_schedule_overrides")
          .update(overrideData)
          .eq("id", existingOverride.id);

        if (error) throw error;
        toast.success("Override updated successfully");
      } else {
        const { error } = await supabase
          .from("branch_schedule_overrides")
          .insert([overrideData]);

        if (error) throw error;
        toast.success("Override created successfully");
      }

      await fetchOverrides();
      setIsEditing(false);
      resetForm();
    } catch (error: any) {
      console.error("Error saving override:", error);
      toast.error(error.message || "Failed to save override");
    } finally {
      setIsSaving(false);
    }
  };

  const handleApplyToSelected = async () => {
    if (selectedDates.length === 0) {
      toast.error("Please select at least one date");
      return;
    }

    if (overrideType === "custom_hours" && timeSlots.length === 0) {
      toast.error("Please add at least one time slot for custom hours");
      return;
    }

    // Validate time slots
    for (const slot of timeSlots) {
      if (slot.open >= slot.close) {
        toast.error("Closing time must be after opening time");
        return;
      }
    }

    setIsSaving(true);

    try {
      const overridesToInsert = selectedDates.map(date => ({
        branch_id: branchId,
        date: format(date, "yyyy-MM-dd"),
        override_type: overrideType,
        time_slots: (overrideType === "custom_hours" ? timeSlots : []) as any,
        reason: reason.trim() || null,
      }));

      // First, delete existing overrides for selected dates
      const dateStrings = selectedDates.map(d => format(d, "yyyy-MM-dd"));
      await supabase
        .from("branch_schedule_overrides")
        .delete()
        .eq("branch_id", branchId)
        .in("date", dateStrings);

      // Then insert new overrides
      const { error } = await supabase
        .from("branch_schedule_overrides")
        .insert(overridesToInsert);

      if (error) throw error;

      toast.success(`Override applied to ${selectedDates.length} date(s) successfully`);
      await fetchOverrides();
      setSelectedDates([]);
      setIsMultiSelectMode(false);
      resetForm();
    } catch (error: any) {
      console.error("Error applying overrides:", error);
      toast.error(error.message || "Failed to apply overrides");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from("branch_schedule_overrides")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;

      toast.success("Override deleted successfully");
      await fetchOverrides();
      setIsEditing(false);
      resetForm();
    } catch (error: any) {
      console.error("Error deleting override:", error);
      toast.error("Failed to delete override");
    } finally {
      setDeleteId(null);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    resetForm();
  };

  // Staff assignment handlers
  const checkStaffConflicts = async (staffId: string, date: Date, timeSlots: StaffTimeSlot[]) => {
    const staff = availableStaff.find((s) => s.id === staffId);
    if (!staff) return [];

    const dateStr = format(date, "yyyy-MM-dd");

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
      .eq("date", dateStr)
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
      dateStr,
      timeSlots,
      existingAssignments,
      branchId
    );
  };

  const handleAssignStaff = async () => {
    if (!selectedStaffId || staffTimeSlots.length === 0 || !selectedDate) {
      toast.error("Please select staff and at least one time slot");
      return;
    }

    // Check for conflicts
    const conflicts = await checkStaffConflicts(selectedStaffId, selectedDate, staffTimeSlots);

    if (conflicts.length > 0) {
      const conflictMsg = formatConflictMessage(conflicts);
      setConflictWarning(conflictMsg);
      setPendingStaffAssignment({ staffId: selectedStaffId, timeSlots: staffTimeSlots, reason: staffReason });
      setShowConflictDialog(true);
      return;
    }

    await saveStaffAssignment(selectedStaffId, selectedDate, staffTimeSlots, staffReason);
  };

  const saveStaffAssignment = async (staffId: string, date: Date, timeSlots: StaffTimeSlot[], reason?: string) => {
    try {
      const { error } = await supabase.from("staff_date_assignments").insert({
        staff_id: staffId,
        branch_id: branchId,
        date: format(date, "yyyy-MM-dd"),
        time_slots: timeSlots as any,
        reason: reason || null,
      });

      if (error) throw error;

      toast.success("Staff assigned successfully");
      await fetchStaffAssignments();
      setShowStaffForm(false);
      resetStaffForm();
    } catch (error: any) {
      console.error("Error assigning staff:", error);
      toast.error("Failed to assign staff");
    }
  };

  const handleConfirmStaffWithConflict = () => {
    if (pendingStaffAssignment && selectedDate) {
      saveStaffAssignment(
        pendingStaffAssignment.staffId,
        selectedDate,
        pendingStaffAssignment.timeSlots,
        pendingStaffAssignment.reason
      );
    }
    setShowConflictDialog(false);
    setConflictWarning("");
    setPendingStaffAssignment(null);
  };

  const handleDeleteStaffAssignment = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from("staff_date_assignments")
        .delete()
        .eq("id", assignmentId);

      if (error) throw error;

      toast.success("Staff assignment deleted");
      await fetchStaffAssignments();
    } catch (error: any) {
      console.error("Error deleting assignment:", error);
      toast.error("Failed to delete assignment");
    }
  };

  const resetStaffForm = () => {
    setSelectedStaffId("");
    setStaffTimeSlots([{ start: "09:00", end: "17:00" }]);
    setStaffReason("");
  };

  const addStaffTimeSlot = () => {
    setStaffTimeSlots([...staffTimeSlots, { start: "09:00", end: "17:00" }]);
  };

  const removeStaffTimeSlot = (index: number) => {
    setStaffTimeSlots(staffTimeSlots.filter((_, i) => i !== index));
  };

  const updateStaffTimeSlot = (index: number, field: "start" | "end", value: string) => {
    const updated = [...staffTimeSlots];
    updated[index][field] = value;
    setStaffTimeSlots(updated);
  };

  const selectedOverride = selectedDate ? getOverrideForDate(selectedDate) : null;

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">Loading calendar...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Branch Hours Calendar
              {isMultiSelectMode && (
                <Badge variant="secondary" className="ml-2">
                  {selectedDates.length} selected
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {isMultiSelectMode 
                ? "Click dates to select multiple, then apply override to all"
                : "Color-coded availability for quick reference"}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant={isMultiSelectMode ? "default" : "outline"} 
              size="sm"
              onClick={toggleMultiSelectMode}
            >
              {isMultiSelectMode ? <CheckSquare className="h-4 w-4 mr-1" /> : <Square className="h-4 w-4 mr-1" />}
              {isMultiSelectMode ? "Exit Multi-Select" : "Multi-Select"}
            </Button>
            {isMultiSelectMode && selectedDates.length > 0 && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={clearSelection}
              >
                Clear ({selectedDates.length})
              </Button>
            )}
            <div className="border-l h-8 mx-2" />
            <Button variant="outline" size="icon" onClick={handlePreviousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-[140px] text-center font-semibold">
              {format(currentMonth, "MMMM yyyy")}
            </div>
            <Button variant="outline" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Calendar Grid */}
          <div>
            {/* Week day headers */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {weekDays.map(day => (
                <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-2">
              {allDays.map((day, index) => {
                if (!day) {
                  return <div key={`empty-${index}`} className="aspect-square" />;
                }

                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isMultiSelected = isDateSelected(day);
                const isToday = isSameDay(day, new Date());
                const isCurrentMonth = isSameMonth(day, currentMonth);

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => handleDateClick(day)}
                    className={cn(
                      "aspect-square rounded-lg border-2 transition-all relative",
                      "flex flex-col items-center justify-center",
                      "hover:scale-105 hover:shadow-md",
                      isCurrentMonth ? "opacity-100" : "opacity-40",
                      isMultiSelected ? "ring-2 ring-primary ring-offset-2 bg-primary/10" : "",
                      isSelected && !isMultiSelectMode ? "ring-2 ring-primary ring-offset-2" : "",
                      isToday ? "border-primary" : getDateColor(day)
                    )}
                  >
                    {isMultiSelected && (
                      <div className="absolute top-0.5 right-0.5">
                        <CheckSquare className="h-3 w-3 text-primary" />
                      </div>
                    )}
                    <span className="text-xs font-medium">
                      {format(day, "d")}
                    </span>
                    {isCurrentMonth && (
                      <div className="mt-0.5">
                        {getDateIndicator(day)}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <span>🟢</span>
              <span className="text-xs text-muted-foreground">Regular Hours</span>
            </div>
            <div className="flex items-center gap-2">
              <span>🟡</span>
              <span className="text-xs text-muted-foreground">Custom Hours</span>
            </div>
            <div className="flex items-center gap-2">
              <span>🔴</span>
              <span className="text-xs text-muted-foreground">Closed</span>
            </div>
          </div>

          {/* Quick Selection Shortcuts */}
          {isMultiSelectMode && (
            <div className="pt-4 border-t">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Quick Selection</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllWeekends}
                >
                  Select All Weekends
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectNext7Days}
                >
                  Select Next 7 Days
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectThisMonth}
                >
                  Select This Month
                </Button>
              </div>
            </div>
          )}

          {/* Multi-Select Override Form */}
          {isMultiSelectMode && selectedDates.length > 0 && (
            <div className="pt-4 border-t space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">
                  Apply Override to {selectedDates.length} Date(s)
                </h4>
              </div>

              <div className="space-y-4 p-4 bg-primary/5 rounded-lg border-2 border-primary/20">
                <div className="space-y-2">
                  <Label>Override Type</Label>
                  <RadioGroup value={overrideType} onValueChange={setOverrideType}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="closed" id="multi-closed" />
                      <Label htmlFor="multi-closed" className="font-normal cursor-pointer">
                        🔴 Closed - Branch closed for these dates
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="custom_hours" id="multi-custom" />
                      <Label htmlFor="multi-custom" className="font-normal cursor-pointer">
                        🟡 Custom Hours - Different hours than regular schedule
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {overrideType === "custom_hours" && (
                  <div className="space-y-3">
                    <Label>Time Slots</Label>
                    {timeSlots.map((slot, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={slot.open}
                          onChange={(e) => updateTimeSlot(index, "open", e.target.value)}
                          className="flex-1"
                        />
                        <span className="text-muted-foreground text-sm">to</span>
                        <Input
                          type="time"
                          value={slot.close}
                          onChange={(e) => updateTimeSlot(index, "close", e.target.value)}
                          className="flex-1"
                        />
                        {timeSlots.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeTimeSlot(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addTimeSlot}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Time Slot
                    </Button>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="multi-reason">Reason (Optional)</Label>
                  <Textarea
                    id="multi-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g., Christmas Holiday, Black Friday Sale"
                    rows={2}
                  />
                </div>

                <div className="flex justify-between items-center pt-2">
                  <div className="text-sm text-muted-foreground">
                    Selected dates: {selectedDates.map(d => format(d, "MMM d")).join(", ")}
                  </div>
                  <Button
                    onClick={handleApplyToSelected}
                    disabled={isSaving}
                    size="sm"
                  >
                    <Save className="h-3 w-3 mr-1" />
                    {isSaving ? "Applying..." : "Apply to All Selected"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Selected Date Details & Quick Edit */}
          {!isMultiSelectMode && selectedDate && (
            <div className="pt-4 border-t space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">
                  {format(selectedDate, "EEEE, MMMM d, yyyy")}
                </h4>
              </div>

              <Tabs defaultValue="hours" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="hours" className="text-xs sm:text-sm">Branch Hours</TabsTrigger>
                  <TabsTrigger value="staff" className="text-xs sm:text-sm">Staff Assignments</TabsTrigger>
                </TabsList>

                <TabsContent value="hours" className="space-y-4 mt-4">
                  <div className="flex justify-between items-center">
                    {!isEditing && (
                      <div className="flex gap-2">
                        {selectedOverride ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setIsEditing(true);
                                loadOverrideIntoForm(selectedOverride);
                              }}
                            >
                              <Edit2 className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setDeleteId(selectedOverride.id)}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Delete
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => {
                              setIsEditing(true);
                              resetForm();
                            }}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add Override
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-4 p-3 sm:p-4 bg-muted/50 rounded-lg">
                      <div className="space-y-2">
                        <Label className="text-sm">Override Type</Label>
                        <RadioGroup value={overrideType} onValueChange={setOverrideType}>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="closed" id="quick-closed" />
                            <Label htmlFor="quick-closed" className="font-normal cursor-pointer text-sm">
                              🔴 Closed - Branch closed for this date
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="custom_hours" id="quick-custom" />
                            <Label htmlFor="quick-custom" className="font-normal cursor-pointer text-sm">
                              🟡 Custom Hours - Different hours than regular schedule
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>

                      {overrideType === "custom_hours" && (
                        <div className="space-y-3">
                          <Label className="text-sm">Time Slots</Label>
                          {timeSlots.map((slot, index) => (
                            <div key={index} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                              <div className="flex items-center gap-2 flex-1">
                                <Input
                                  type="time"
                                  value={slot.open}
                                  onChange={(e) => updateTimeSlot(index, "open", e.target.value)}
                                  className="flex-1"
                                />
                                <span className="text-muted-foreground text-xs sm:text-sm">to</span>
                                <Input
                                  type="time"
                                  value={slot.close}
                                  onChange={(e) => updateTimeSlot(index, "close", e.target.value)}
                                  className="flex-1"
                                />
                              </div>
                              {timeSlots.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="sm:w-auto w-full"
                                  onClick={() => removeTimeSlot(index)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addTimeSlot}
                            className="w-full sm:w-auto"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add Time Slot
                          </Button>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="quick-reason" className="text-sm">Reason (Optional)</Label>
                        <Textarea
                          id="quick-reason"
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder="e.g., Christmas Holiday, Black Friday Sale"
                          rows={2}
                          className="text-sm"
                        />
                      </div>

                      <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={handleCancelEdit}
                          disabled={isSaving}
                          size="sm"
                          className="w-full sm:w-auto"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleSave}
                          disabled={isSaving}
                          size="sm"
                          className="w-full sm:w-auto"
                        >
                          <Save className="h-3 w-3 mr-1" />
                          {isSaving ? "Saving..." : "Save"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {selectedOverride ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={selectedOverride.override_type === "closed" ? "destructive" : "secondary"}>
                              {selectedOverride.override_type === "closed" ? "Closed" : "Custom Hours"}
                            </Badge>
                          </div>
                          {selectedOverride.override_type === "custom_hours" && selectedOverride.time_slots.length > 0 && (
                            <div className="text-sm">
                              <span className="font-medium">Hours: </span>
                              {selectedOverride.time_slots.map((slot: any, idx: number) => (
                                <span key={idx}>
                                  {slot.open} - {slot.close}
                                  {idx < selectedOverride.time_slots.length - 1 && ", "}
                                </span>
                              ))}
                            </div>
                          )}
                          {selectedOverride.reason && (
                            <div className="text-sm text-muted-foreground">
                              <span className="font-medium">Reason: </span>
                              {selectedOverride.reason}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          Regular operating hours apply
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="staff" className="space-y-4 mt-4">
                  {(() => {
                    const dateStr = format(selectedDate, "yyyy-MM-dd");
                    const selectedDateAssignments = staffAssignments.filter(a => a.date === dateStr);
                    
                    return (
                      <>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span className="text-sm font-medium">{selectedDateAssignments.length} staff assigned</span>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => {
                              setShowStaffForm(true);
                              resetStaffForm();
                            }}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Assign Staff
                          </Button>
                        </div>

                        {selectedDateAssignments.length > 0 && (
                          <div className="space-y-2">
                            {selectedDateAssignments.map((assignment) => (
                              <Card key={assignment.id} className="p-3 sm:p-4">
                                <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                                  <div className="space-y-1 flex-1">
                                    <p className="font-medium text-sm">
                                      {assignment.staff.first_name} {assignment.staff.last_name}
                                    </p>
                                    <div className="space-y-1">
                                      {assignment.time_slots.map((slot: StaffTimeSlot, idx: number) => (
                                        <p key={idx} className="text-xs text-muted-foreground">
                                          {slot.start} - {slot.end}
                                        </p>
                                      ))}
                                    </div>
                                    {assignment.reason && (
                                      <Badge variant="outline" className="mt-2 text-xs">
                                        {assignment.reason}
                                      </Badge>
                                    )}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="self-end sm:self-start"
                                    onClick={() => handleDeleteStaffAssignment(assignment.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </Card>
                            ))}
                          </div>
                        )}

                        {showStaffForm && (
                          <div className="space-y-4 p-3 sm:p-4 bg-muted/50 rounded-lg border">
                            <div className="space-y-2">
                              <Label className="text-sm">Select Staff</Label>
                              <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                                <SelectTrigger className="text-sm">
                                  <SelectValue placeholder="Choose a staff member" />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableStaff.map((staff) => (
                                    <SelectItem key={staff.id} value={staff.id} className="text-sm">
                                      {staff.first_name} {staff.last_name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-sm">Working Hours</Label>
                              {staffTimeSlots.map((slot, index) => (
                                <div key={index} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                  <div className="flex items-center gap-2 flex-1">
                                    <Input
                                      type="time"
                                      value={slot.start}
                                      onChange={(e) => updateStaffTimeSlot(index, "start", e.target.value)}
                                      className="flex-1 text-sm"
                                    />
                                    <span className="text-xs sm:text-sm text-muted-foreground">to</span>
                                    <Input
                                      type="time"
                                      value={slot.end}
                                      onChange={(e) => updateStaffTimeSlot(index, "end", e.target.value)}
                                      className="flex-1 text-sm"
                                    />
                                  </div>
                                  {staffTimeSlots.length > 1 && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="sm:w-auto w-full"
                                      onClick={() => removeStaffTimeSlot(index)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              ))}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addStaffTimeSlot}
                                className="w-full sm:w-auto"
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Add Time Slot
                              </Button>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="staff-reason" className="text-sm">Reason (Optional)</Label>
                              <Textarea
                                id="staff-reason"
                                value={staffReason}
                                onChange={(e) => setStaffReason(e.target.value)}
                                placeholder="e.g., Extra coverage needed"
                                rows={2}
                                className="text-sm"
                              />
                            </div>

                            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setShowStaffForm(false);
                                  resetStaffForm();
                                }}
                                size="sm"
                                className="w-full sm:w-auto"
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={handleAssignStaff}
                                disabled={!selectedStaffId}
                                size="sm"
                                className="w-full sm:w-auto"
                              >
                                <Users className="h-3 w-3 mr-1" />
                                Assign Staff
                              </Button>
                            </div>
                          </div>
                        )}

                        {selectedDateAssignments.length === 0 && !showStaffForm && (
                          <p className="text-sm text-muted-foreground text-center py-8">
                            No staff assigned for this date
                          </p>
                        )}
                      </>
                    );
                  })()}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent className="max-w-[95vw] sm:max-w-lg mx-4">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-base sm:text-lg">Delete Override?</AlertDialogTitle>
              <AlertDialogDescription className="text-sm">
                This will remove the date-specific hours and revert to the regular weekly schedule for this date.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Staff Conflict Warning Dialog */}
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
                setPendingStaffAssignment(null);
              }} className="w-full sm:w-auto">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmStaffWithConflict} className="w-full sm:w-auto">
                Proceed Anyway
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}