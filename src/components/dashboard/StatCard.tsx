import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
}

export function StatCard({ title, value, change, changeLabel, icon: Icon, trend }: StatCardProps) {
  const getTrendIcon = () => {
    if (trend === "up") return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (trend === "down") return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  const getTrendColor = () => {
    if (trend === "up") return "text-green-500";
    if (trend === "down") return "text-red-500";
    return "text-muted-foreground";
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
        <CardTitle className="text-xs sm:text-sm font-medium">{title}</CardTitle>
        <Icon className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
        <div className="text-lg sm:text-2xl font-bold truncate">{value}</div>
        {change !== undefined && (
          <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground mt-1">
            {getTrendIcon()}
            <span className={getTrendColor()}>
              {change > 0 ? "+" : ""}{change}%
            </span>
            {changeLabel && <span className="ml-1 truncate">{changeLabel}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
