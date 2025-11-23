import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, Trash2, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface TimeSlot {
  start: string;
  end: string;
}

interface DateScheduleOverrideProps {
  staffId: string;
  branchId: string;
  onOverrideAdded?: () => void;
}

export default function DateScheduleOverride({
  staffId,
  branchId,
  onOverrideAdded,
}: DateScheduleOverrideProps) {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [overrideType, setOverrideType] = useState<'unavailable' | 'custom_hours'>('custom_hours');
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([{ start: "09:00", end: "17:00" }]);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const addTimeSlot = () => {
    setTimeSlots([...timeSlots, { start: "09:00", end: "17:00" }]);
  };

  const removeTimeSlot = (index: number) => {
    setTimeSlots(timeSlots.filter((_, i) => i !== index));
  };

  const updateTimeSlot = (index: number, field: 'start' | 'end', value: string) => {
    const updated = [...timeSlots];
    updated[index][field] = value;
    setTimeSlots(updated);
  };

  const handleSaveOverride = async () => {
    if (!selectedDate) {
      toast.error("Please select a date");
      return;
    }

    if (overrideType === 'custom_hours' && timeSlots.length === 0) {
      toast.error("Please add at least one time slot");
      return;
    }

    setLoading(true);

    try {
      const overrideData = {
        branch_id: branchId,
        date: format(selectedDate, 'yyyy-MM-dd'),
        override_type: overrideType,
        staff_id: staffId,
        time_slots: overrideType === 'custom_hours' ? timeSlots as any : [] as any,
        reason,
      };

      const { error } = await supabase
        .from('staff_schedule_overrides')
        .upsert(overrideData, {
          onConflict: 'staff_id,branch_id,date'
        });

      if (error) throw error;

      toast.success("Date override saved successfully");
      setSelectedDate(undefined);
      setTimeSlots([{ start: "09:00", end: "17:00" }]);
      setReason("");
      onOverrideAdded?.();
    } catch (error) {
      console.error("Error saving override:", error);
      toast.error("Failed to save date override");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          Date-Specific Schedule Override
        </CardTitle>
        <CardDescription>
          Set custom hours or mark unavailable for specific dates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Select Date</Label>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="rounded-md border"
            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
          />
        </div>

        <div className="space-y-2">
          <Label>Override Type</Label>
          <RadioGroup value={overrideType} onValueChange={(v) => setOverrideType(v as any)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="custom_hours" id="custom" />
              <Label htmlFor="custom" className="font-normal cursor-pointer">
                Custom Hours (different from regular schedule)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="unavailable" id="unavailable" />
              <Label htmlFor="unavailable" className="font-normal cursor-pointer">
                Unavailable (time off)
              </Label>
            </div>
          </RadioGroup>
        </div>

        {overrideType === 'custom_hours' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Time Slots</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addTimeSlot}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Slot
              </Button>
            </div>
            {timeSlots.map((slot, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  type="time"
                  value={slot.start}
                  onChange={(e) => updateTimeSlot(index, 'start', e.target.value)}
                  className="flex-1"
                />
                <span className="text-muted-foreground">to</span>
                <Input
                  type="time"
                  value={slot.end}
                  onChange={(e) => updateTimeSlot(index, 'end', e.target.value)}
                  className="flex-1"
                />
                {timeSlots.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeTimeSlot(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="reason">Reason (Optional)</Label>
          <Textarea
            id="reason"
            placeholder="e.g., Holiday, Special event, Personal day"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
          />
        </div>

        <Button 
          onClick={handleSaveOverride} 
          disabled={!selectedDate || loading}
          className="w-full"
        >
          {loading ? "Saving..." : "Save Override"}
        </Button>
      </CardContent>
    </Card>
  );
}
