import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X, Save, Plus, Edit2, Trash2, CheckSquare, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
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

  useEffect(() => {
    fetchOverrides();
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

  const getDateIndicator = (date: Date): string => {
    const override = getOverrideForDate(date);
    if (!override) return "🟢";
    
    if (override.override_type === "closed") return "🔴";
    return "🟡";
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
                      <span className="text-[10px] mt-0.5">
                        {getDateIndicator(day)}
                      </span>
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
                <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                  <div className="space-y-2">
                    <Label>Override Type</Label>
                    <RadioGroup value={overrideType} onValueChange={setOverrideType}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="closed" id="quick-closed" />
                        <Label htmlFor="quick-closed" className="font-normal cursor-pointer">
                          🔴 Closed - Branch closed for this date
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="custom_hours" id="quick-custom" />
                        <Label htmlFor="quick-custom" className="font-normal cursor-pointer">
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
                    <Label htmlFor="quick-reason">Reason (Optional)</Label>
                    <Textarea
                      id="quick-reason"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="e.g., Christmas Holiday, Black Friday Sale"
                      rows={2}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                      size="sm"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={isSaving}
                      size="sm"
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
            </div>
          )}
        </div>

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Override?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove the date-specific hours and revert to the regular weekly schedule for this date.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}