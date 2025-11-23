import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Calendar as CalendarIcon, Clock } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface TimeSlot {
  start: string;
  end: string;
}

interface ScheduleOverride {
  id: string;
  date: string;
  override_type: 'available' | 'unavailable' | 'custom_hours';
  time_slots: TimeSlot[];
  reason?: string;
}

interface ScheduleOverrideListProps {
  staffId: string;
  branchId: string;
  onOverrideDeleted?: () => void;
}

export default function ScheduleOverrideList({
  staffId,
  branchId,
  onOverrideDeleted,
}: ScheduleOverrideListProps) {
  const [overrides, setOverrides] = useState<ScheduleOverride[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOverrides = async () => {
    try {
      const { data, error } = await supabase
        .from('staff_schedule_overrides')
        .select('*')
        .eq('staff_id', staffId)
        .eq('branch_id', branchId)
        .gte('date', format(new Date(), 'yyyy-MM-dd'))
        .order('date', { ascending: true });

      if (error) throw error;
      setOverrides((data || []).map(item => ({
        ...item,
        time_slots: (item.time_slots as any) || []
      })));
    } catch (error) {
      console.error("Error fetching overrides:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverrides();
  }, [staffId, branchId]);

  const handleDeleteOverride = async (id: string) => {
    try {
      const { error } = await supabase
        .from('staff_schedule_overrides')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success("Override deleted");
      fetchOverrides();
      onOverrideDeleted?.();
    } catch (error) {
      console.error("Error deleting override:", error);
      toast.error("Failed to delete override");
    }
  };

  const getTypeBadge = (type: string) => {
    if (type === 'unavailable') {
      return <Badge variant="destructive">Unavailable</Badge>;
    }
    if (type === 'custom_hours') {
      return <Badge variant="secondary">Custom Hours</Badge>;
    }
    return <Badge>Regular</Badge>;
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading overrides...</div>;
  }

  if (overrides.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Overrides</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No schedule overrides set
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          Upcoming Overrides
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {overrides.map((override) => (
            <div
              key={override.id}
              className="flex items-start justify-between p-3 border rounded-lg"
            >
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {format(new Date(override.date), 'MMM dd, yyyy (EEEE)')}
                  </span>
                  {getTypeBadge(override.override_type)}
                </div>
                
                {override.override_type === 'custom_hours' && override.time_slots.length > 0 && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {override.time_slots.map((slot, idx) => (
                      <span key={idx}>
                        {slot.start} - {slot.end}
                        {idx < override.time_slots.length - 1 && ', '}
                      </span>
                    ))}
                  </div>
                )}

                {override.reason && (
                  <p className="text-sm text-muted-foreground">
                    {override.reason}
                  </p>
                )}
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDeleteOverride(override.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
