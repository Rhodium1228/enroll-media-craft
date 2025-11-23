import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Users, AlertTriangle, Plus, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { ScheduleConflict } from "@/lib/scheduleConflicts";

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
}

interface DayDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | null;
  schedules: StaffSchedule[];
  conflicts: Map<string, ScheduleConflict[]>;
  onScheduleUpdate: () => void;
}

export default function DayDetailDialog({
  open,
  onOpenChange,
  date,
  schedules,
  conflicts,
  onScheduleUpdate,
}: DayDetailDialogProps) {
  const { toast } = useToast();
  const [allStaff, setAllStaff] = useState<Staff[]>([]);
  const [allBranches, setAllBranches] = useState<Branch[]>([]);
  const [selectedStaff, setSelectedStaff] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      fetchStaffAndBranches();
    }
  }, [open]);

  const fetchStaffAndBranches = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all staff
      const { data: staffData } = await supabase
        .from("staff")
        .select("id, first_name, last_name, profile_image_url")
        .eq("created_by", user.id)
        .eq("status", "active");

      setAllStaff(staffData || []);

      // Fetch all branches
      const { data: branchData } = await supabase
        .from("branches")
        .select("id, name")
        .eq("created_by", user.id);

      setAllBranches(branchData || []);
    } catch (error: any) {
      console.error("Error fetching data:", error);
    }
  };

  if (!date) return null;

  const dayOfWeek = format(date, "EEEE").toLowerCase();
  const formattedDate = format(date, "MMMM d, yyyy");

  // Get schedules for this specific day
  const daySchedules = schedules.filter((schedule) => {
    const daySchedule = schedule.working_hours[dayOfWeek];
    return daySchedule && !daySchedule.closed && daySchedule.slots && daySchedule.slots.length > 0;
  });

  // Get conflicts for this day
  const dayConflicts = Array.from(conflicts.entries())
    .map(([key, conflictList]) => {
      const [staffId, branchId] = key.split("-");
      return {
        staffId,
        branchId,
        conflicts: conflictList.filter((c) => c.day === dayOfWeek),
      };
    })
    .filter((c) => c.conflicts.length > 0);

  const handleQuickAssign = async () => {
    if (!selectedStaff || !selectedBranch) {
      toast({
        title: "Validation Error",
        description: "Please select both staff and branch",
        variant: "destructive",
      });
      return;
    }

    if (startTime >= endTime) {
      toast({
        title: "Validation Error",
        description: "End time must be after start time",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      // Fetch existing schedule
      const { data: existing } = await supabase
        .from("staff_branches")
        .select("working_hours")
        .eq("staff_id", selectedStaff)
        .eq("branch_id", selectedBranch)
        .single();

      const workingHours = existing?.working_hours || {};
      const daySchedule = workingHours[dayOfWeek] || { slots: [] };

      // Add new slot
      const newSlot = { start: startTime, end: endTime };
      const updatedSlots = [...(daySchedule.slots || []), newSlot];

      const updatedWorkingHours: Record<string, any> = {
        ...(typeof workingHours === 'object' ? workingHours : {}),
        [dayOfWeek]: {
          closed: false,
          slots: updatedSlots,
        },
      };

      // Upsert the schedule
      const { error } = await supabase
        .from("staff_branches")
        .upsert({
          staff_id: selectedStaff,
          branch_id: selectedBranch,
          working_hours: updatedWorkingHours,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Schedule updated successfully",
      });

      setSelectedStaff("");
      setSelectedBranch("");
      setStartTime("09:00");
      setEndTime("17:00");
      onScheduleUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {format(date, "EEEE")} - {formattedDate}
          </DialogTitle>
          <DialogDescription>
            View and manage staff schedules for this day
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="schedules" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="schedules">
              Schedules ({daySchedules.length})
            </TabsTrigger>
            <TabsTrigger value="assign">Quick Assign</TabsTrigger>
          </TabsList>

          <TabsContent value="schedules" className="mt-6 space-y-4">
            {dayConflicts.length > 0 && (
              <Card className="border-destructive">
                <CardHeader>
                  <CardTitle className="text-destructive flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    {dayConflicts.length} Conflict{dayConflicts.length > 1 ? "s" : ""} Detected
                  </CardTitle>
                </CardHeader>
              </Card>
            )}

            {daySchedules.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No staff scheduled for this day</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {daySchedules.map((schedule) => {
                  const daySchedule = schedule.working_hours[dayOfWeek];
                  const hasConflict = dayConflicts.some(
                    (c) => c.staffId === schedule.staff.id && c.branchId === schedule.branch.id
                  );

                  return (
                    <Card
                      key={`${schedule.staff.id}-${schedule.branch.id}`}
                      className={hasConflict ? "border-destructive" : ""}
                    >
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {schedule.staff.profile_image_url ? (
                              <img
                                src={schedule.staff.profile_image_url}
                                alt={`${schedule.staff.first_name} ${schedule.staff.last_name}`}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold">
                                {schedule.staff.first_name[0]}
                                {schedule.staff.last_name[0]}
                              </div>
                            )}
                            <div>
                              <p className="font-semibold">
                                {schedule.staff.first_name} {schedule.staff.last_name}
                              </p>
                              <Badge className={`${schedule.branch_color} text-white text-xs`}>
                                {schedule.branch.name}
                              </Badge>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {hasConflict && (
                              <Badge variant="destructive" className="flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Conflict
                              </Badge>
                            )}
                            <div className="flex flex-col gap-1">
                              {daySchedule.slots.map((slot: any, idx: number) => (
                                <div
                                  key={idx}
                                  className={`text-sm px-3 py-1 rounded-full ${schedule.branch_color} text-white font-medium flex items-center gap-2`}
                                >
                                  <Clock className="h-3 w-3" />
                                  {slot.start} - {slot.end}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="assign" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Quick Assignment
                </CardTitle>
                <DialogDescription>
                  Quickly assign a staff member to a branch for {format(date, "EEEE")}
                </DialogDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Staff Member *</Label>
                  <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select staff member" />
                    </SelectTrigger>
                    <SelectContent>
                      {allStaff.map((staff) => (
                        <SelectItem key={staff.id} value={staff.id}>
                          {staff.first_name} {staff.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Branch *</Label>
                  <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {allBranches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Time *</Label>
                    <Input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Time *</Label>
                    <Input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                </div>

                <Button
                  onClick={handleQuickAssign}
                  disabled={saving}
                  className="w-full"
                >
                  {saving ? "Assigning..." : "Assign to Schedule"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
