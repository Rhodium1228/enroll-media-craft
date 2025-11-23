import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, AlertTriangle, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DateAssignmentConflict, TimeSlot } from "@/lib/dateAssignmentUtils";

interface Staff {
  id: string;
  first_name: string;
  last_name: string;
}

interface Branch {
  id: string;
  name: string;
}

interface StaffDateSchedule {
  staff: Staff;
  branch: Branch;
  assignment: {
    id: string;
    date: string;
    time_slots: TimeSlot[];
    reason?: string;
  };
  branch_color: string;
}

interface MonthCalendarProps {
  schedules: StaffDateSchedule[];
  conflicts: Map<string, DateAssignmentConflict[]>;
  onDayClick: (date: Date) => void;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function MonthCalendar({ schedules, conflicts, onDayClick }: MonthCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getStaffForDay = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const staffOnDay = new Set<string>();

    schedules.forEach((schedule) => {
      if (schedule.assignment.date === dateStr && schedule.assignment.time_slots.length > 0) {
        staffOnDay.add(schedule.staff.id);
      }
    });

    return staffOnDay.size;
  };

  const getConflictsForDay = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const dayConflicts = conflicts.get(dateStr) || [];
    return dayConflicts.length;
  };

  const isToday = (date: Date) => isSameDay(date, new Date());

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          {format(currentDate, "MMMM yyyy")}
        </h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={() => setCurrentDate(new Date())}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-7 gap-2">
            {/* Weekday Headers */}
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="text-center font-semibold text-sm text-muted-foreground py-2"
              >
                {day}
              </div>
            ))}

            {/* Calendar Days */}
            {calendarDays.map((date) => {
              const staffCount = getStaffForDay(date);
              const conflictCount = getConflictsForDay(date);
              const isCurrentMonth = isSameMonth(date, currentDate);
              const isCurrentDay = isToday(date);

              return (
                <button
                  key={date.toISOString()}
                  onClick={() => onDayClick(date)}
                  className={cn(
                    "min-h-[100px] p-2 rounded-lg border-2 transition-all hover:shadow-lg hover:scale-105",
                    "flex flex-col items-start",
                    isCurrentMonth
                      ? "bg-card border-border hover:bg-accent"
                      : "bg-muted/50 border-muted text-muted-foreground",
                    isCurrentDay && "border-primary bg-primary/5",
                    conflictCount > 0 && "border-destructive"
                  )}
                >
                  <div className="flex justify-between items-start w-full mb-2">
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        isCurrentDay && "text-primary"
                      )}
                    >
                      {format(date, "d")}
                    </span>
                    {conflictCount > 0 && (
                      <Badge variant="destructive" className="h-5 text-xs flex items-center gap-1 px-1">
                        <AlertTriangle className="h-3 w-3" />
                        {conflictCount}
                      </Badge>
                    )}
                  </div>

                  {isCurrentMonth && (
                    <div className="w-full space-y-1">
                      {staffCount > 0 ? (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" />
                          <span>{staffCount} staff</span>
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">No staff</div>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
