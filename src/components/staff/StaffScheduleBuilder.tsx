import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Plus, Trash2, Calendar as CalendarIcon, Edit2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const getDayKey = (date: Date): string => {
    return format(date, "EEEE").toLowerCase();
  };

  const selectedDayKey = selectedDate ? getDayKey(selectedDate) : null;
  const selectedDayLabel = selectedDate ? format(selectedDate, "EEEE, MMMM d") : null;

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

  const getConfiguredDays = () => {
    return DAYS.filter(({ key }) => {
      const daySchedule = value[key];
      return daySchedule && (daySchedule.closed || (daySchedule.slots && daySchedule.slots.length > 0));
    });
  };

  const configuredDays = getConfiguredDays();

  return (
    <div className="space-y-6">
      {/* Configured Days List */}
      {configuredDays.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <Label className="text-sm font-medium mb-3 block">Configured Schedule</Label>
            <div className="space-y-2">
              {configuredDays.map(({ key, label }) => {
                const daySchedule = value[key];
                const isClosed = daySchedule?.closed || false;
                
                return (
                  <div key={key} className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
                    <div className="flex-1">
                      <div className="font-medium">{label}</div>
                      {isClosed ? (
                        <Badge variant="secondary" className="mt-1">Closed</Badge>
                      ) : (
                        <div className="text-sm text-muted-foreground mt-1">
                          {daySchedule?.slots.map((slot, i) => (
                            <span key={i}>
                              {slot.start} - {slot.end}
                              {i < daySchedule.slots.length - 1 && ", "}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const dayDate = DAYS.findIndex(d => d.key === key);
                        const today = new Date();
                        const targetDate = new Date(today);
                        targetDate.setDate(today.getDate() + ((dayDate - today.getDay() + 7) % 7));
                        setSelectedDate(targetDate);
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Date Selection */}
      <Card>
        <CardContent className="pt-4">
          <Label className="text-sm font-medium mb-3 block">
            <CalendarIcon className="h-4 w-4 inline mr-2" />
            Select a Day to Schedule
          </Label>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className={cn("rounded-md border pointer-events-auto")}
            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
          />
        </CardContent>
      </Card>

      {/* Time Configuration for Selected Date */}
      {selectedDate && selectedDayKey && (
        <Card>
          <CardContent className="pt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">{selectedDayLabel}</Label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={value[selectedDayKey]?.closed || false}
                    onCheckedChange={(checked) => {
                      updateDay(selectedDayKey, {
                        closed: checked as boolean,
                        slots: checked ? [] : [{ start: "09:00", end: "17:00" }],
                      });
                    }}
                  />
                  <span className="text-sm">Closed</span>
                </div>
              </div>

              {!value[selectedDayKey]?.closed && (
                <div className="space-y-3">
                  <Label className="text-sm text-muted-foreground">Working Hours</Label>
                  {(value[selectedDayKey]?.slots || []).map((slot, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={slot.start}
                        onChange={(e) => updateSlot(selectedDayKey, index, "start", e.target.value)}
                        className="flex-1"
                      />
                      <span className="text-muted-foreground">to</span>
                      <Input
                        type="time"
                        value={slot.end}
                        onChange={(e) => updateSlot(selectedDayKey, index, "end", e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSlot(selectedDayKey, index)}
                        disabled={(value[selectedDayKey]?.slots || []).length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addSlot(selectedDayKey)}
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
      )}
    </div>
  );
}
