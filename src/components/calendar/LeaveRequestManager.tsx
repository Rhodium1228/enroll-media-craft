import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Calendar as CalendarIcon, Check, X } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface LeaveRequest {
  id: string;
  start_date: string;
  end_date: string;
  leave_type: string;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
}

interface LeaveRequestManagerProps {
  staffId: string;
  onLeaveChanged?: () => void;
}

export default function LeaveRequestManager({
  staffId,
  onLeaveChanged,
}: LeaveRequestManagerProps) {
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date } | undefined>();
  const [leaveType, setLeaveType] = useState<string>("vacation");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);

  const fetchLeaveRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('staff_leave_requests')
        .select('*')
        .eq('staff_id', staffId)
        .order('start_date', { ascending: false });

      if (error) throw error;
      setLeaveRequests(data || []);
    } catch (error) {
      console.error("Error fetching leave requests:", error);
    }
  };

  useEffect(() => {
    fetchLeaveRequests();
  }, [staffId]);

  const handleSubmitLeave = async () => {
    if (!dateRange?.from) {
      toast.error("Please select start date");
      return;
    }

    setLoading(true);

    try {
      const leaveData = {
        end_date: format(dateRange.to || dateRange.from, 'yyyy-MM-dd'),
        leave_type: leaveType as any,
        staff_id: staffId,
        start_date: format(dateRange.from, 'yyyy-MM-dd'),
        status: 'approved' as any, // Auto-approve for now
        reason,
      };

      const { error } = await supabase
        .from('staff_leave_requests')
        .insert(leaveData);

      if (error) throw error;

      toast.success("Leave request added successfully");
      setDateRange(undefined);
      setReason("");
      fetchLeaveRequests();
      onLeaveChanged?.();
    } catch (error) {
      console.error("Error adding leave:", error);
      toast.error("Failed to add leave request");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLeave = async (id: string) => {
    try {
      const { error } = await supabase
        .from('staff_leave_requests')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success("Leave request deleted");
      fetchLeaveRequests();
      onLeaveChanged?.();
    } catch (error) {
      console.error("Error deleting leave:", error);
      toast.error("Failed to delete leave request");
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: "secondary",
      approved: "default",
      rejected: "destructive",
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants]}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Request Time Off
          </CardTitle>
          <CardDescription>
            Mark dates when staff member will be unavailable
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Select Date Range</Label>
            <Calendar
              mode="range"
              selected={dateRange as any}
              onSelect={(range) => setDateRange(range || undefined)}
              className="rounded-md border"
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
            />
          </div>

          <div className="space-y-2">
            <Label>Leave Type</Label>
            <Select value={leaveType} onValueChange={setLeaveType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vacation">Vacation</SelectItem>
                <SelectItem value="sick">Sick Leave</SelectItem>
                <SelectItem value="personal">Personal</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="leave-reason">Reason (Optional)</Label>
            <Textarea
              id="leave-reason"
              placeholder="Brief description"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>

          <Button 
            onClick={handleSubmitLeave} 
            disabled={!dateRange?.from || loading}
            className="w-full"
          >
            {loading ? "Submitting..." : "Submit Leave Request"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming Leave Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {leaveRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No leave requests
            </p>
          ) : (
            <div className="space-y-3">
              {leaveRequests.map((leave) => (
                <div
                  key={leave.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {format(new Date(leave.start_date), 'MMM dd, yyyy')}
                        {leave.start_date !== leave.end_date && 
                          ` - ${format(new Date(leave.end_date), 'MMM dd, yyyy')}`
                        }
                      </span>
                      {getStatusBadge(leave.status)}
                    </div>
                    <p className="text-sm text-muted-foreground capitalize">
                      {leave.leave_type}
                      {leave.reason && ` - ${leave.reason}`}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteLeave(leave.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
