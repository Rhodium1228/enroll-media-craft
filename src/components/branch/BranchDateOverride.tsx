import { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TimeSlot {
  open: string;
  close: string;
}

interface BranchDateOverrideProps {
  branchId: string;
  onSaved: () => void;
  onCancel: () => void;
  existingOverride?: {
    id: string;
    date: Date;
    override_type: string;
    time_slots: TimeSlot[];
    reason: string | null;
  };
}

export function BranchDateOverride({
  branchId,
  onSaved,
  onCancel,
  existingOverride,
}: BranchDateOverrideProps) {
  const [date, setDate] = useState<Date | undefined>(
    existingOverride?.date || undefined
  );
  const [overrideType, setOverrideType] = useState<string>(
    existingOverride?.override_type || "closed"
  );
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(
    existingOverride?.time_slots || [{ open: "09:00", close: "17:00" }]
  );
  const [reason, setReason] = useState(existingOverride?.reason || "");
  const [isSaving, setIsSaving] = useState(false);

  const addTimeSlot = () => {
    setTimeSlots([...timeSlots, { open: "09:00", close: "17:00" }]);
  };

  const removeTimeSlot = (index: number) => {
    setTimeSlots(timeSlots.filter((_, i) => i !== index));
  };

  const updateTimeSlot = (
    index: number,
    field: "open" | "close",
    value: string
  ) => {
    const updated = [...timeSlots];
    updated[index][field] = value;
    setTimeSlots(updated);
  };

  const handleSave = async () => {
    if (!date) {
      toast.error("Please select a date");
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
      const overrideData = {
        branch_id: branchId,
        date: format(date, "yyyy-MM-dd"),
        override_type: overrideType,
        time_slots: (overrideType === "custom_hours" ? timeSlots : []) as any,
        reason: reason.trim() || null,
      };

      if (existingOverride?.id) {
        const { error } = await supabase
          .from("branch_schedule_overrides")
          .update(overrideData)
          .eq("id", existingOverride.id);

        if (error) throw error;
        toast.success("Branch hours override updated successfully");
      } else {
        const { error } = await supabase
          .from("branch_schedule_overrides")
          .insert([overrideData]);

        if (error) throw error;
        toast.success("Branch hours override created successfully");
      }

      onSaved();
    } catch (error: any) {
      console.error("Error saving override:", error);
      toast.error(error.message || "Failed to save override");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Select Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              initialFocus
              disabled={(date) => date < new Date()}
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label>Override Type</Label>
        <RadioGroup value={overrideType} onValueChange={setOverrideType}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="closed" id="closed" />
            <Label htmlFor="closed" className="font-normal cursor-pointer">
              🔴 Closed - Branch closed for this date
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="custom_hours" id="custom_hours" />
            <Label htmlFor="custom_hours" className="font-normal cursor-pointer">
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
              <span className="text-muted-foreground">to</span>
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
            + Add Time Slot
          </Button>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="reason">Reason (Optional)</Label>
        <Textarea
          id="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g., Christmas Holiday, Black Friday Sale, Staff Training"
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Saving..." : "Save Override"}
        </Button>
      </div>
    </div>
  );
}