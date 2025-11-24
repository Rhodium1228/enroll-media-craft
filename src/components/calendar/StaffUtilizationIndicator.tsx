import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";
import { StaffUtilizationMetrics, getUtilizationColor, getUtilizationBarColor } from "@/lib/staffUtilization";
import { cn } from "@/lib/utils";

interface StaffUtilizationIndicatorProps {
  metrics: StaffUtilizationMetrics;
  compact?: boolean;
}

export const StaffUtilizationIndicator = ({ metrics, compact = false }: StaffUtilizationIndicatorProps) => {
  const colors = getUtilizationColor(metrics.status);
  const barColor = getUtilizationBarColor(metrics.utilizationPercentage);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Badge className={`text-xs ${colors.bg} ${colors.text}`}>
          {metrics.utilizationPercentage}%
        </Badge>
        {metrics.status === "underbooked" && <TrendingDown className="h-3 w-3 text-yellow-500" />}
        {metrics.status === "overbooked" && <TrendingUp className="h-3 w-3 text-red-500" />}
        {metrics.status === "optimal" && <Activity className="h-3 w-3 text-green-500" />}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">Utilization</span>
        <Badge className={`${colors.bg} ${colors.text}`}>
          {colors.label}
        </Badge>
      </div>
      
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{metrics.utilizationPercentage}%</span>
          <span>{metrics.appointmentCount} appointments</span>
        </div>
        <Progress value={metrics.utilizationPercentage} className="h-2" />
      </div>

      <div className="text-xs text-muted-foreground">
        {Math.floor(metrics.totalBookedMinutes / 60)}h {metrics.totalBookedMinutes % 60}m booked of{" "}
        {Math.floor(metrics.totalAvailableMinutes / 60)}h {metrics.totalAvailableMinutes % 60}m available
      </div>
    </div>
  );
};
