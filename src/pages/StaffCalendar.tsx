import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Calendar as CalendarIcon, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { detectDateAssignmentConflicts } from "@/lib/dateAssignmentUtils";
import type { DateAssignmentConflict, TimeSlot } from "@/lib/dateAssignmentUtils";
import MonthCalendar from "@/components/calendar/MonthCalendar";
import DayDetailDialog from "@/components/calendar/DayDetailDialog";

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

const BRANCH_COLORS = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-green-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-teal-500",
  "bg-indigo-500",
  "bg-amber-500",
];

export default function StaffCalendar() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<StaffDateSchedule[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string>("all");
  const [allStaff, setAllStaff] = useState<Staff[]>([]);
  const [conflicts, setConflicts] = useState<Map<string, DateAssignmentConflict[]>>(new Map());
  const [viewMode, setViewMode] = useState<"month">("month");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dayDialogOpen, setDayDialogOpen] = useState(false);

  useEffect(() => {
    fetchSchedules();
  }, []);

  useEffect(() => {
    if (schedules.length > 0) {
      detectAllConflicts();
    }
  }, [schedules]);

  const fetchSchedules = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/");
        return;
      }

      // Fetch all staff date assignments
      const { data, error } = await supabase
        .from("staff_date_assignments")
        .select(`
          id,
          staff_id,
          branch_id,
          date,
          time_slots,
          reason,
          staff:staff_id (
            id,
            first_name,
            last_name,
            profile_image_url
          ),
          branches:branch_id (
            id,
            name,
            created_by
          )
        `)
        .eq("branches.created_by", user.id)
        .order("date", { ascending: true });

      if (error) throw error;

      // Extract unique staff
      const uniqueStaff = Array.from(
        new Map(
          data
            ?.filter((item: any) => item.staff)
            .map((item: any) => [item.staff.id, item.staff])
        ).values()
      );
      setAllStaff(uniqueStaff as Staff[]);

      // Assign colors to branches
      const branchColorMap = new Map<string, string>();
      let colorIndex = 0;

      const schedulesData = (data || [])
        .filter((item: any) => item.staff && item.branches)
        .map((item: any) => {
          if (!branchColorMap.has(item.branch_id)) {
            branchColorMap.set(item.branch_id, BRANCH_COLORS[colorIndex % BRANCH_COLORS.length]);
            colorIndex++;
          }

          return {
            staff: item.staff,
            branch: item.branches,
            assignment: {
              id: item.id,
              date: item.date,
              time_slots: item.time_slots || [],
              reason: item.reason,
            },
            branch_color: branchColorMap.get(item.branch_id)!,
          };
        });

      setSchedules(schedulesData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const detectAllConflicts = () => {
    const conflictMap = new Map<string, DateAssignmentConflict[]>();

    // Group schedules by staff and date
    const staffDateMap = new Map<string, Map<string, StaffDateSchedule[]>>();
    schedules.forEach((schedule) => {
      const staffId = schedule.staff.id;
      const date = schedule.assignment.date;
      
      if (!staffDateMap.has(staffId)) {
        staffDateMap.set(staffId, new Map());
      }
      const dateMap = staffDateMap.get(staffId)!;
      if (!dateMap.has(date)) {
        dateMap.set(date, []);
      }
      dateMap.get(date)!.push(schedule);
    });

    // Check conflicts for each staff member on each date
    staffDateMap.forEach((dateMap, staffId) => {
      dateMap.forEach((dateSchedules, date) => {
        if (dateSchedules.length < 2) return; // No conflicts if only at one branch

        dateSchedules.forEach((schedule) => {
          const otherAssignments = dateSchedules
            .filter((s) => s.branch.id !== schedule.branch.id)
            .map((s) => ({
              branch_id: s.branch.id,
              branch_name: s.branch.name,
              time_slots: s.assignment.time_slots,
            }));

          const staffConflicts = detectDateAssignmentConflicts(
            staffId,
            `${schedule.staff.first_name} ${schedule.staff.last_name}`,
            date,
            schedule.assignment.time_slots,
            otherAssignments,
            schedule.branch.id
          );

          if (staffConflicts.length > 0) {
            const key = `${date}`;
            const existing = conflictMap.get(key) || [];
            conflictMap.set(key, [...existing, ...staffConflicts]);
          }
        });
      });
    });

    setConflicts(conflictMap);
  };


  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setDayDialogOpen(true);
  };

  const handleScheduleUpdate = () => {
    fetchSchedules();
  };


  const filteredSchedules =
    selectedStaff === "all"
      ? schedules
      : schedules.filter((s) => s.staff.id === selectedStaff);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-foreground flex items-center gap-3">
                <CalendarIcon className="h-10 w-10 text-primary" />
                Staff Calendar
              </h1>
              <p className="text-muted-foreground mt-2">
                Monthly calendar showing staff date assignments across all branches
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-64">
                <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by staff" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Staff</SelectItem>
                    {allStaff.map((staff) => (
                      <SelectItem key={staff.id} value={staff.id}>
                        {staff.first_name} {staff.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {conflicts.size > 0 && (
            <Card className="border-destructive mb-6 animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Schedule Conflicts Detected
                </CardTitle>
                <CardDescription>
                  Days with conflicts are marked with red borders in the calendar
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>

        {schedules.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <CalendarIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No assignments found</h3>
                <p className="text-muted-foreground">
                  Start by creating date-specific staff assignments in your branches
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <MonthCalendar
            schedules={filteredSchedules}
            conflicts={conflicts}
            onDayClick={handleDayClick}
          />
        )}

        <DayDetailDialog
          open={dayDialogOpen}
          onOpenChange={setDayDialogOpen}
          date={selectedDate}
          schedules={schedules}
          conflicts={conflicts}
          onScheduleUpdate={handleScheduleUpdate}
        />

        {/* Legend */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg">Legend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Branch Colors */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Branches</h4>
                <div className="flex flex-wrap gap-4">
                  {schedules
                    .reduce((acc, schedule) => {
                      if (!acc.find((b) => b.id === schedule.branch.id)) {
                        acc.push({
                          id: schedule.branch.id,
                          name: schedule.branch.name,
                          color: schedule.branch_color,
                        });
                      }
                      return acc;
                    }, [] as Array<{ id: string; name: string; color: string }>)
                    .map((branch) => (
                      <div key={branch.id} className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded ${branch.color}`}></div>
                        <span className="text-sm">{branch.name}</span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Schedule Types */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Schedule Types</h4>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <span>🟢</span>
                    <span className="text-sm">Regular Schedule</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>🟡</span>
                    <span className="text-sm">Custom Hours</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>🔴</span>
                    <span className="text-sm">Unavailable / Leave</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>⚪</span>
                    <span className="text-sm">Closed / Not Scheduled</span>
                  </div>
                </div>
              </div>

              {/* Other Indicators */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Other Indicators</h4>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded border-2 border-destructive bg-destructive/10"></div>
                    <span className="text-sm">Schedule Conflict</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-muted border-2 border-primary flex items-center justify-center">
                      <span className="text-[8px]">⋮⋮</span>
                    </div>
                    <span className="text-sm">Draggable (Week View)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs">🏢🔴</span>
                    <span className="text-sm">Branch Closed</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
