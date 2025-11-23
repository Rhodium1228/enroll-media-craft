import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Award, Medal } from "lucide-react";

interface StaffData {
  id: string;
  first_name: string;
  last_name: string;
  profile_image_url?: string;
  appointments: number;
  revenue: number;
  branches: string[];
}

interface StaffLeaderboardProps {
  staff: StaffData[];
}

export function StaffLeaderboard({ staff }: StaffLeaderboardProps) {
  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (index === 1) return <Award className="w-5 h-5 text-gray-400" />;
    if (index === 2) return <Medal className="w-5 h-5 text-orange-500" />;
    return <span className="text-sm font-bold text-muted-foreground">#{index + 1}</span>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Staff Leaderboard</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {staff.map((member, index) => (
            <div key={member.id} className="flex items-center gap-4">
              <div className="flex-shrink-0 w-8 flex justify-center">
                {getRankIcon(index)}
              </div>
              <Avatar className="h-10 w-10">
                <AvatarImage src={member.profile_image_url} />
                <AvatarFallback>
                  {member.first_name.charAt(0)}{member.last_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {member.first_name} {member.last_name}
                </p>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <span>{member.appointments} appointments</span>
                  <span>•</span>
                  <span>${member.revenue.toFixed(2)}</span>
                </div>
              </div>
              <Badge variant="outline">{member.branches.length} branches</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
