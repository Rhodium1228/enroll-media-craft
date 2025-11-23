import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";

interface TimeSlot {
  start: string;
  end: string;
}

interface DaySchedule {
  closed?: boolean;
  slots: TimeSlot[];
}

interface WorkingHours {
  [day: string]: DaySchedule;
}

interface StaffScheduleBuilderProps {
  value: WorkingHours;
  onChange: (hours: WorkingHours) => void;
}

const DAYS = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
];

export default function StaffScheduleBuilder({ value, onChange }: StaffScheduleBuilderProps) {
  const updateDay = (day: string, updates: Partial<DaySchedule>) => {
    onChange({
      ...value,
      [day]: { ...value[day], ...updates },
    });
  };

  const addSlot = (day: string) => {
    const currentSlots = value[day]?.slots || [];
    updateDay(day, {
      slots: [...currentSlots, { start: "09:00", end: "17:00" }],
    });
  };

  const removeSlot = (day: string, index: number) => {
    const currentSlots = value[day]?.slots || [];
    updateDay(day, {
      slots: currentSlots.filter((_, i) => i !== index),
    });
  };

  const updateSlot = (day: string, index: number, field: keyof TimeSlot, timeValue: string) => {
    const currentSlots = [...(value[day]?.slots || [])];
    currentSlots[index] = { ...currentSlots[index], [field]: timeValue };
    updateDay(day, { slots: currentSlots });
  };

  return (
    <div className="space-y-4">
      {DAYS.map(({ key, label }) => {
        const daySchedule = value[key] || { slots: [] };
        const isClosed = daySchedule.closed || false;

        return (
          <Card key={key}>
            <CardContent className="pt-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">{label}</Label>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={isClosed}
                      onCheckedChange={(checked) => {
                        updateDay(key, {
                          closed: checked as boolean,
                          slots: checked ? [] : [{ start: "09:00", end: "17:00" }],
                        });
                      }}
                    />
                    <span className="text-sm">Closed</span>
                  </div>
                </div>

                {!isClosed && (
                  <div className="space-y-2">
                    {daySchedule.slots.map((slot, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={slot.start}
                          onChange={(e) => updateSlot(key, index, "start", e.target.value)}
                          className="flex-1"
                        />
                        <span className="text-muted-foreground">to</span>
                        <Input
                          type="time"
                          value={slot.end}
                          onChange={(e) => updateSlot(key, index, "end", e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeSlot(key, index)}
                          disabled={daySchedule.slots.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addSlot(key)}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Time Slot
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
