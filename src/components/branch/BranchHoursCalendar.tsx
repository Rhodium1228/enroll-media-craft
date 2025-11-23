import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface BranchOverride {
  id: string;
  date: string;
  override_type: string;
  time_slots: any[];
  reason: string | null;
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
    setSelectedDate(isSameDay(date, selectedDate || new Date("1900-01-01")) ? null : date);
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
            </CardTitle>
            <CardDescription>
              Color-coded availability for quick reference
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
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
                      isSelected ? "ring-2 ring-primary ring-offset-2" : "",
                      isToday ? "border-primary" : getDateColor(day)
                    )}
                  >
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

          {/* Selected Date Details */}
          {selectedDate && (
            <div className="pt-4 border-t">
              <h4 className="font-semibold mb-2">
                {format(selectedDate, "EEEE, MMMM d, yyyy")}
              </h4>
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
      </CardContent>
    </Card>
  );
}