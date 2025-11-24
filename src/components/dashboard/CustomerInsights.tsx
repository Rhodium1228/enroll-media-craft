import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, UserX, TrendingUp } from "lucide-react";

interface CustomerStats {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  atRiskCustomers: number;
  repeatRate: number;
}

interface CustomerInsightsProps {
  stats: CustomerStats;
}

export function CustomerInsights({ stats }: CustomerInsightsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer Analytics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium">Total Customers</p>
                <p className="text-xl sm:text-2xl font-bold">{stats.totalCustomers}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4">
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 rounded-full bg-green-500/10">
                  <UserCheck className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">New</p>
                  <p className="text-lg sm:text-xl font-bold">{stats.newCustomers}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 rounded-full bg-blue-500/10">
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Returning</p>
                  <p className="text-lg sm:text-xl font-bold">{stats.returningCustomers}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-950/20">
            <div className="flex items-center gap-2">
              <UserX className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-medium">At-Risk Customers</span>
              <Badge variant="outline" className="ml-auto">{stats.atRiskCustomers}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Haven't visited in 30+ days
            </p>
          </div>

          <div className="p-3 rounded-lg bg-muted">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Repeat Customer Rate</span>
              <span className="text-lg font-bold text-primary">{stats.repeatRate}%</span>
            </div>
            <div className="w-full bg-background rounded-full h-2 mt-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all" 
                style={{ width: `${stats.repeatRate}%` }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
