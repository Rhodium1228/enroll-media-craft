import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, CalendarClock } from "lucide-react";

interface DayHours {
  open: string;
  close: string;
  closed?: boolean;
}

interface OpeningHoursEditorProps {
  value: Record<string, DayHours>;
  onChange: (hours: Record<string, DayHours>) => void;
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

export const OpeningHoursEditor = ({ value, onChange }: OpeningHoursEditorProps) => {
  const [hours, setHours] = useState<Record<string, DayHours>>(
    value || {
      monday: { open: "09:00", close: "17:00" },
      tuesday: { open: "09:00", close: "17:00" },
      wednesday: { open: "09:00", close: "17:00" },
      thursday: { open: "09:00", close: "17:00" },
      friday: { open: "09:00", close: "17:00" },
      saturday: { open: "09:00", close: "17:00", closed: true },
      sunday: { open: "09:00", close: "17:00", closed: true },
    }
  );

  const updateDay = (day: string, field: keyof DayHours, value: string | boolean) => {
    const updated = {
      ...hours,
      [day]: { ...hours[day], [field]: value },
    };
    setHours(updated);
    onChange(updated);
  };

  const copyToWeekdays = () => {
    const mondayHours = hours.monday;
    const updated = { ...hours };
    ["tuesday", "wednesday", "thursday", "friday"].forEach((day) => {
      updated[day] = { ...mondayHours };
    });
    setHours(updated);
    onChange(updated);
  };

  const copyToAll = () => {
    const mondayHours = hours.monday;
    const updated = { ...hours };
    DAYS.forEach(({ key }) => {
      updated[key] = { ...mondayHours };
    });
    setHours(updated);
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <CalendarClock className="w-4 h-4" />
          Operating Hours
        </Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={copyToWeekdays}
            className="gap-2"
          >
            <Copy className="w-3 h-3" />
            Copy to Weekdays
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={copyToAll}
            className="gap-2"
          >
            <Copy className="w-3 h-3" />
            Copy to All
          </Button>
        </div>
      </div>

      <div className="border rounded-lg divide-y">
        {DAYS.map(({ key, label }) => (
          <div key={key} className="p-4 flex items-center gap-4">
            <div className="w-28 font-medium">{label}</div>
            <div className="flex items-center gap-4 flex-1">
              <div className="flex items-center gap-2 flex-1">
                <Input
                  type="time"
                  value={hours[key]?.open || "09:00"}
                  onChange={(e) => updateDay(key, "open", e.target.value)}
                  disabled={hours[key]?.closed}
                  className="w-32"
                />
                <span className="text-muted-foreground">to</span>
                <Input
                  type="time"
                  value={hours[key]?.close || "17:00"}
                  onChange={(e) => updateDay(key, "close", e.target.value)}
                  disabled={hours[key]?.closed}
                  className="w-32"
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`closed-${key}`}
                  checked={hours[key]?.closed || false}
                  onCheckedChange={(checked) => updateDay(key, "closed", checked as boolean)}
                />
                <Label
                  htmlFor={`closed-${key}`}
                  className="text-sm text-muted-foreground cursor-pointer"
                >
                  Closed
                </Label>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
