import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, AlertTriangle, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScheduleConflict } from "@/lib/scheduleConflicts";
import { getScheduleType, getScheduleTypeIcon } from "@/lib/scheduleTypeUtils";
import type { ScheduleType } from "@/lib/scheduleTypeUtils";

interface Staff {
  id: string;
  first_name: string;
  last_name: string;
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

interface MonthCalendarProps {
  schedules: StaffSchedule[];
  conflicts: Map<string, ScheduleConflict[]>;
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

  const getDayOfWeek = (date: Date) => {
    return format(date, "EEEE").toLowerCase();
  };

  const getStaffForDay = (date: Date) => {
    const staffOnDay = new Set<string>();

    schedules.forEach((schedule) => {
      const scheduleType = getScheduleType(
        date,
        schedule.working_hours || {},
        schedule.overrides || [],
        schedule.leave_requests || []
      );
      if (scheduleType === 'regular' || scheduleType === 'custom') {
        staffOnDay.add(schedule.staff.id);
      }
    });

    return staffOnDay.size;
  };

  const getScheduleTypesForDay = (date: Date): Record<ScheduleType, number> => {
    const typeCounts: Record<ScheduleType, number> = {
      regular: 0,
      custom: 0,
      unavailable: 0,
      closed: 0,
    };

    schedules.forEach((schedule) => {
      const scheduleType = getScheduleType(
        date,
        schedule.working_hours || {},
        schedule.overrides || [],
        schedule.leave_requests || []
      );
      typeCounts[scheduleType]++;
    });

    return typeCounts;
  };

  const getConflictsForDay = (date: Date) => {
    const dayOfWeek = getDayOfWeek(date);
    let conflictCount = 0;

    conflicts.forEach((staffConflicts) => {
      const dayConflicts = staffConflicts.filter((c) => c.day === dayOfWeek);
      conflictCount += dayConflicts.length;
    });

    return conflictCount;
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
              const scheduleTypes = getScheduleTypesForDay(date);
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
                        <>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                            <Users className="h-3 w-3" />
                            <span>{staffCount} staff</span>
                          </div>
                          
                          {/* Schedule Type Indicators */}
                          <div className="space-y-0.5">
                            {scheduleTypes.regular > 0 && (
                              <div className="flex items-center gap-1 text-xs">
                                <span>🟢</span>
                                <span className="text-muted-foreground">{scheduleTypes.regular}</span>
                              </div>
                            )}
                            {scheduleTypes.custom > 0 && (
                              <div className="flex items-center gap-1 text-xs">
                                <span>🟡</span>
                                <span className="text-muted-foreground">{scheduleTypes.custom}</span>
                              </div>
                            )}
                            {scheduleTypes.unavailable > 0 && (
                              <div className="flex items-center gap-1 text-xs">
                                <span>🔴</span>
                                <span className="text-muted-foreground">{scheduleTypes.unavailable}</span>
                              </div>
                            )}
                          </div>
                        </>
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
