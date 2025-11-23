import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Clock, Calendar as CalendarIcon } from "lucide-react";
import { format, addDays, subDays, parseISO, isWithinInterval } from "date-fns";
import { cn } from "@/lib/utils";
import { getScheduleType, getScheduleTypeIcon, getScheduleTypeBadge } from "@/lib/scheduleTypeUtils";
import type { ScheduleType } from "@/lib/scheduleTypeUtils";

interface Staff {
  id: string;
  first_name: string;
  last_name: string;
  profile_image_url: string | null;
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
  branch_overrides?: any[];
  branch_hours?: any;
}

interface TimelineViewProps {
  schedules: StaffSchedule[];
  selectedDate?: Date;
  onDateChange?: (date: Date) => void;
}

interface TimeBlock {
  start: number; // minutes from midnight
  end: number;
  branchName: string;
  branchColor: string;
  scheduleType: ScheduleType;
}

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 7 AM to 9 PM
const HOUR_WIDTH = 80; // pixels per hour
const ROW_HEIGHT = 60; // pixels per staff row

export default function TimelineView({ schedules, selectedDate, onDateChange }: TimelineViewProps) {
  const [currentDate, setCurrentDate] = useState(selectedDate || new Date());

  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const minutesToPixels = (minutes: number): number => {
    const startMinutes = 7 * 60; // 7 AM
    return ((minutes - startMinutes) / 60) * HOUR_WIDTH;
  };

  const getActualScheduleForDate = (
    date: Date,
    schedule: StaffSchedule
  ): TimeBlock[] => {
    const dayName = format(date, 'EEEE').toLowerCase();
    const scheduleType = getScheduleType(
      date,
      schedule.working_hours || {},
      schedule.overrides || [],
      schedule.leave_requests || []
    );

    // If unavailable or closed, return empty
    if (scheduleType === 'unavailable' || scheduleType === 'closed') {
      return [];
    }

    // Check for date override with custom hours
    const dateStr = format(date, 'yyyy-MM-dd');
    const override = (schedule.overrides || []).find(o => o.date === dateStr);
    
    if (override && override.override_type === 'custom_hours' && override.time_slots) {
      const slots = Array.isArray(override.time_slots) 
        ? override.time_slots 
        : JSON.parse(override.time_slots || '[]');
      
      return slots.map((slot: any) => ({
        start: timeToMinutes(slot.start),
        end: timeToMinutes(slot.end),
        branchName: schedule.branch.name,
        branchColor: schedule.branch_color,
        scheduleType: 'custom' as ScheduleType,
      }));
    }

    // Use recurring schedule
    const daySchedule = schedule.working_hours?.[dayName];
    if (!daySchedule || daySchedule.closed || !daySchedule.slots) {
      return [];
    }

    return daySchedule.slots.map((slot: any) => ({
      start: timeToMinutes(slot.start),
      end: timeToMinutes(slot.end),
      branchName: schedule.branch.name,
      branchColor: schedule.branch_color,
      scheduleType: 'regular' as ScheduleType,
    }));
  };

  const handlePreviousDay = () => {
    const newDate = subDays(currentDate, 1);
    setCurrentDate(newDate);
    onDateChange?.(newDate);
  };

  const handleNextDay = () => {
    const newDate = addDays(currentDate, 1);
    setCurrentDate(newDate);
    onDateChange?.(newDate);
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    onDateChange?.(today);
  };

  // Group schedules by staff
  const staffSchedulesMap = new Map<string, StaffSchedule[]>();
  schedules.forEach((schedule) => {
    const staffId = schedule.staff.id;
    if (!staffSchedulesMap.has(staffId)) {
      staffSchedulesMap.set(staffId, []);
    }
    staffSchedulesMap.get(staffId)!.push(schedule);
  });

  return (
    <div className="space-y-4">
      {/* Date Navigation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Timeline View
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={handlePreviousDay}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={handleToday}>
                Today
              </Button>
              <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-muted/50">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">
                  {format(currentDate, 'EEEE, MMMM d, yyyy')}
                </span>
              </div>
              <Button variant="outline" size="icon" onClick={handleNextDay}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Timeline */}
      <Card>
        <CardContent className="p-6">
          <div className="relative">
            {/* Time Header */}
            <div className="flex border-b pb-2 mb-4">
              <div className="w-48 flex-shrink-0"></div>
              <div className="flex-1 relative" style={{ minWidth: HOURS.length * HOUR_WIDTH }}>
                <div className="flex">
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className="text-xs font-medium text-muted-foreground text-center"
                      style={{ width: HOUR_WIDTH }}
                    >
                      {hour % 12 || 12} {hour >= 12 ? 'PM' : 'AM'}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Staff Rows */}
            <div className="space-y-2">
              {Array.from(staffSchedulesMap.entries()).map(([staffId, staffSchedules]) => {
                const staff = staffSchedules[0].staff;
                
                return (
                  <div key={staffId} className="flex items-start border-b pb-2">
                    {/* Staff Info */}
                    <div className="w-48 flex-shrink-0 pr-4">
                      <div className="flex items-center gap-2">
                        {staff.profile_image_url ? (
                          <img
                            src={staff.profile_image_url}
                            alt={`${staff.first_name} ${staff.last_name}`}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xs font-semibold text-primary">
                              {staff.first_name[0]}{staff.last_name[0]}
                            </span>
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium">
                            {staff.first_name} {staff.last_name}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Timeline Blocks */}
                    <div 
                      className="flex-1 relative bg-muted/20 rounded"
                      style={{ 
                        minWidth: HOURS.length * HOUR_WIDTH,
                        height: ROW_HEIGHT 
                      }}
                    >
                      {/* Hour Grid Lines */}
                      <div className="absolute inset-0 flex">
                        {HOURS.map((hour, idx) => (
                          <div
                            key={hour}
                            className="border-r border-border/30"
                            style={{ width: HOUR_WIDTH }}
                          />
                        ))}
                      </div>

                      {/* Schedule Blocks */}
                      {staffSchedules.map((schedule, idx) => {
                        const blocks = getActualScheduleForDate(currentDate, schedule);
                        
                        return blocks.map((block, blockIdx) => {
                          const left = minutesToPixels(block.start);
                          const width = minutesToPixels(block.end) - left;
                          const scheduleTypeBadge = getScheduleTypeBadge(block.scheduleType);
                          const scheduleIcon = getScheduleTypeIcon(block.scheduleType);

                          return (
                            <div
                              key={`${idx}-${blockIdx}`}
                              className={cn(
                                "absolute rounded-md shadow-sm border-2 p-2",
                                "hover:shadow-lg hover:z-10 transition-all cursor-pointer",
                                block.branchColor,
                                "text-white"
                              )}
                              style={{
                                left: `${left}px`,
                                width: `${width}px`,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                height: '48px',
                              }}
                            >
                              <div className="flex items-center justify-between h-full">
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold truncate">
                                    {block.branchName}
                                  </p>
                                  <p className="text-[10px] opacity-90">
                                    {format(new Date(0, 0, 0, Math.floor(block.start / 60), block.start % 60), 'h:mm a')}
                                    {' - '}
                                    {format(new Date(0, 0, 0, Math.floor(block.end / 60), block.end % 60), 'h:mm a')}
                                  </p>
                                </div>
                                <span className="text-sm ml-1">{scheduleIcon}</span>
                              </div>
                            </div>
                          );
                        });
                      })}

                      {/* Show "No schedule" if no blocks */}
                      {staffSchedules.every(s => getActualScheduleForDate(currentDate, s).length === 0) && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xs text-muted-foreground">No schedule</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {staffSchedulesMap.size === 0 && (
              <div className="text-center py-12">
                <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No schedules found</h3>
                <p className="text-muted-foreground">
                  Start by enrolling staff members to your branches
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Timeline Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span>🟢</span>
              <span>Regular Schedule</span>
            </div>
            <div className="flex items-center gap-2">
              <span>🟡</span>
              <span>Custom Hours</span>
            </div>
            <div className="flex items-center gap-2">
              <span>🔴</span>
              <span>Unavailable</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-muted/20 border border-border/30"></div>
              <span>No schedule / Gap</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
