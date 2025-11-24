import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays, startOfDay } from "date-fns";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, Users } from "lucide-react";

interface StaffAvailabilityPreviewProps {
  branchId: string;
  onDateSelect?: (date: Date) => void;
  selectedDate?: Date;
}

interface DayAvailability {
  date: Date;
  dateStr: string;
  staffMembers: Array<{
    id: string;
    first_name: string;
    last_name: string;
  }>;
}

export const StaffAvailabilityPreview = ({ 
  branchId, 
  onDateSelect,
  selectedDate 
}: StaffAvailabilityPreviewProps) => {
  const [loading, setLoading] = useState(false);
  const [availability, setAvailability] = useState<DayAvailability[]>([]);

  useEffect(() => {
    if (branchId) {
      fetchStaffAvailability();
    }
  }, [branchId]);

  const fetchStaffAvailability = async () => {
    setLoading(true);
    
    const today = startOfDay(new Date());
    const nextDays = Array.from({ length: 14 }, (_, i) => addDays(today, i));
    const dateStrings = nextDays.map(date => format(date, "yyyy-MM-dd"));

    const { data, error } = await supabase
      .from("staff_date_assignments")
      .select(`
        date,
        staff_id,
        staff:staff_id (
          id,
          first_name,
          last_name,
          status
        )
      `)
      .eq("branch_id", branchId)
      .in("date", dateStrings)
      .order("date", { ascending: true });

    setLoading(false);

    if (error || !data) {
      setAvailability([]);
      return;
    }

    // Filter out suspended staff and group by date
    const groupedByDate = data
      .filter((item: any) => item.staff && item.staff.status !== 'suspended')
      .reduce((acc: Record<string, any[]>, item: any) => {
        if (!acc[item.date]) {
          acc[item.date] = [];
        }
        // Avoid duplicates
        if (!acc[item.date].find((s: any) => s.id === item.staff.id)) {
          acc[item.date].push(item.staff);
        }
        return acc;
      }, {});

    // Create availability array
    const availabilityData = nextDays.map(date => {
      const dateStr = format(date, "yyyy-MM-dd");
      return {
        date,
        dateStr,
        staffMembers: groupedByDate[dateStr] || [],
      };
    });

    setAvailability(availabilityData);
  };

  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <p className="text-sm">Loading staff availability...</p>
        </div>
      </Card>
    );
  }

  if (availability.length === 0) {
    return (
      <Card className="p-4">
        <p className="text-sm text-muted-foreground">
          No staff assignments found for the next 14 days
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="h-4 w-4 text-primary" />
        <h4 className="font-semibold text-sm">Staff Availability (Next 14 Days)</h4>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {availability.map((day) => {
          const isSelected = selectedDate && format(selectedDate, "yyyy-MM-dd") === day.dateStr;
          const hasStaff = day.staffMembers.length > 0;
          
          return (
            <div
              key={day.dateStr}
              onClick={() => hasStaff && onDateSelect?.(day.date)}
              className={`
                p-3 rounded-lg border-2 transition-all cursor-pointer
                ${isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
                ${!hasStaff ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'}
              `}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {format(day.date, "EEE")}
                </p>
                <Badge variant={hasStaff ? "default" : "secondary"} className="text-xs px-1.5 py-0">
                  {day.staffMembers.length}
                </Badge>
              </div>
              <p className="text-sm font-semibold mb-2">
                {format(day.date, "MMM d")}
              </p>
              
              {hasStaff ? (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" />
                  <span className="truncate">
                    {day.staffMembers.length === 1 
                      ? `${day.staffMembers[0].first_name}`
                      : `${day.staffMembers.length} staff`
                    }
                  </span>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No staff</p>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
};
