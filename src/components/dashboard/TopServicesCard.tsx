import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";

interface ServiceData {
  id: string;
  title: string;
  image_url?: string;
  bookings: number;
  revenue: number;
  trend: "up" | "down";
}

interface TopServicesCardProps {
  services: ServiceData[];
}

export function TopServicesCard({ services }: TopServicesCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Performing Services</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {services.map((service, index) => (
            <div key={service.id} className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <Badge variant="outline" className="w-8 h-8 flex items-center justify-center rounded-full">
                  {index + 1}
                </Badge>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium truncate">{service.title}</p>
                  {service.trend === "up" ? (
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-500" />
                  )}
                </div>
                <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                  <span>{service.bookings} bookings</span>
                  <span>${service.revenue.toFixed(2)} revenue</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
