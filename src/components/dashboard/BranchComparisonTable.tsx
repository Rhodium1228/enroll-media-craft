import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";

interface BranchData {
  id: string;
  name: string;
  logo_url?: string;
  revenue: number;
  appointments: number;
  staffCount: number;
  topService?: string;
  utilization: number;
}

interface BranchComparisonTableProps {
  branches: BranchData[];
}

export function BranchComparisonTable({ branches }: BranchComparisonTableProps) {
  const navigate = useNavigate();

  const getPerformanceBadge = (utilization: number) => {
    if (utilization >= 80) return <Badge className="bg-green-500">Top</Badge>;
    if (utilization >= 50) return <Badge variant="secondary">Average</Badge>;
    return <Badge variant="destructive">Needs Attention</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Branch Performance Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full">
          <div className="min-w-[800px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Branch</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Appointments</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead>Top Service</TableHead>
                  <TableHead>Utilization</TableHead>
                  <TableHead>Performance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branches.map((branch) => (
                  <TableRow 
                    key={branch.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/branch/${branch.id}`)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={branch.logo_url} />
                          <AvatarFallback>{branch.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        {branch.name}
                      </div>
                    </TableCell>
                    <TableCell>${branch.revenue.toFixed(2)}</TableCell>
                    <TableCell>{branch.appointments}</TableCell>
                    <TableCell>{branch.staffCount}</TableCell>
                    <TableCell>{branch.topService || "N/A"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{ width: `${branch.utilization}%` }}
                          />
                        </div>
                        <span className="text-sm">{branch.utilization}%</span>
                      </div>
                    </TableCell>
                    <TableCell>{getPerformanceBadge(branch.utilization)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
