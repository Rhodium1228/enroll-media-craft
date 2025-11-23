import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { TimeSlot } from "@/lib/dateAssignmentUtils";

interface Staff {
  id: string;
  first_name: string;
  last_name: string;
}

interface DateStaffAssignmentFormProps {
  availableStaff: Staff[];
  onSubmit: (staffId: string, timeSlots: TimeSlot[], reason?: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function DateStaffAssignmentForm({
  availableStaff,
  onSubmit,
  onCancel,
  isLoading = false,
}: DateStaffAssignmentFormProps) {
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([
    { start: "09:00", end: "17:00" },
  ]);
  const [reason, setReason] = useState("");

  const handleAddSlot = () => {
    setTimeSlots([...timeSlots, { start: "09:00", end: "17:00" }]);
  };

  const handleRemoveSlot = (index: number) => {
    setTimeSlots(timeSlots.filter((_, i) => i !== index));
  };

  const handleSlotChange = (
    index: number,
    field: "start" | "end",
    value: string
  ) => {
    const newSlots = [...timeSlots];
    newSlots[index][field] = value;
    setTimeSlots(newSlots);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStaffId && timeSlots.length > 0) {
      onSubmit(selectedStaffId, timeSlots, reason || undefined);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Select Staff</Label>
        <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a staff member" />
          </SelectTrigger>
          <SelectContent>
            {availableStaff.map((staff) => (
              <SelectItem key={staff.id} value={staff.id}>
                {staff.first_name} {staff.last_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Working Hours</Label>
        {timeSlots.map((slot, index) => (
          <div key={index} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="flex items-center gap-2 flex-1">
              <Input
                type="time"
                value={slot.start}
                onChange={(e) => handleSlotChange(index, "start", e.target.value)}
                className="flex-1"
              />
              <span className="text-xs sm:text-sm text-muted-foreground">to</span>
              <Input
                type="time"
                value={slot.end}
                onChange={(e) => handleSlotChange(index, "end", e.target.value)}
                className="flex-1"
              />
            </div>
            {timeSlots.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="sm:w-auto w-full"
                onClick={() => handleRemoveSlot(index)}
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
          onClick={handleAddSlot}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Time Slot
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reason">Reason (Optional)</Label>
        <Textarea
          id="reason"
          placeholder="e.g., Special event, extra coverage needed"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
        />
      </div>

      <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} className="w-full sm:w-auto">
          Cancel
        </Button>
        <Button type="submit" disabled={!selectedStaffId || isLoading} className="w-full sm:w-auto">
          {isLoading ? "Assigning..." : "Assign Staff"}
        </Button>
      </div>
    </form>
  );
}
