import { useState, useEffect } from "react";
import { format, isFuture, isPast } from "date-fns";
import { Calendar, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TimeSlot {
  open: string;
  close: string;
}

interface BranchOverride {
  id: string;
  date: string;
  override_type: string;
  time_slots: TimeSlot[];
  reason: string | null;
}

interface BranchOverrideListProps {
  branchId: string;
  onEdit: (override: BranchOverride) => void;
  refreshTrigger?: number;
}

export function BranchOverrideList({
  branchId,
  onEdit,
  refreshTrigger,
}: BranchOverrideListProps) {
  const [overrides, setOverrides] = useState<BranchOverride[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showPast, setShowPast] = useState(false);

  useEffect(() => {
    fetchOverrides();
  }, [branchId, refreshTrigger]);

  const fetchOverrides = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("branch_schedule_overrides")
        .select("*")
        .eq("branch_id", branchId)
        .order("date", { ascending: true });

      if (error) throw error;
      setOverrides((data || []).map(item => ({
        ...item,
        time_slots: (item.time_slots as any) || []
      })));
    } catch (error: any) {
      console.error("Error fetching overrides:", error);
      toast.error("Failed to load branch schedule overrides");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("branch_schedule_overrides")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Override deleted successfully");
      fetchOverrides();
    } catch (error: any) {
      console.error("Error deleting override:", error);
      toast.error("Failed to delete override");
    } finally {
      setDeleteId(null);
    }
  };

  const getOverrideIcon = (type: string) => {
    switch (type) {
      case "closed":
        return "🔴";
      case "custom_hours":
        return "🟡";
      default:
        return "⚪";
    }
  };

  const getOverrideLabel = (type: string) => {
    switch (type) {
      case "closed":
        return "Closed";
      case "custom_hours":
        return "Custom Hours";
      default:
        return "Unknown";
    }
  };

  const formatTimeSlots = (slots: TimeSlot[]) => {
    return slots
      .map((slot) => `${slot.open} - ${slot.close}`)
      .join(", ");
  };

  const filteredOverrides = showPast
    ? overrides
    : overrides.filter((override) => isFuture(new Date(override.date)) || format(new Date(override.date), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd"));

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading overrides...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {filteredOverrides.length} override(s)
          {!showPast && overrides.some(o => isPast(new Date(o.date))) && (
            <span> (hiding past dates)</span>
          )}
        </div>
        {overrides.some(o => isPast(new Date(o.date))) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPast(!showPast)}
          >
            {showPast ? "Hide Past" : "Show Past"}
          </Button>
        )}
      </div>

      {filteredOverrides.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No schedule overrides set</p>
              <p className="text-sm mt-1">
                Add date-specific hours or closures for holidays and special events
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredOverrides.map((override) => {
            const overrideDate = new Date(override.date);
            const isOverridePast = isPast(overrideDate) && format(overrideDate, "yyyy-MM-dd") !== format(new Date(), "yyyy-MM-dd");
            
            return (
              <Card key={override.id} className={isOverridePast ? "opacity-60" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        {getOverrideIcon(override.override_type)}
                        {format(overrideDate, "EEEE, MMMM d, yyyy")}
                      </CardTitle>
                      <CardDescription>
                        {getOverrideLabel(override.override_type)}
                        {override.override_type === "custom_hours" &&
                          override.time_slots.length > 0 && (
                            <span> • {formatTimeSlots(override.time_slots)}</span>
                          )}
                      </CardDescription>
                      {override.reason && (
                        <p className="text-sm text-muted-foreground">
                          {override.reason}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(override)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(override.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Schedule Override?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the date-specific hours and revert to the regular
              weekly schedule for this date. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}