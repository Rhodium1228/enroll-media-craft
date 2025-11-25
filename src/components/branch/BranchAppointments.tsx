import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Clock, User, Phone, Mail, Briefcase } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Appointment {
  id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  booking_reference: string | null;
  staff: {
    first_name: string;
    last_name: string;
  };
  services: {
    title: string;
    cost: number;
    duration: number;
  };
}

interface BranchAppointmentsProps {
  branchId: string;
}

export default function BranchAppointments({ branchId }: BranchAppointmentsProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAppointments();

    // Real-time subscription for appointment changes
    const channel = supabase
      .channel('branch-appointments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `branch_id=eq.${branchId}`
        },
        () => {
          fetchAppointments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [branchId]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("appointments")
        .select(`
          id,
          customer_name,
          customer_email,
          customer_phone,
          date,
          start_time,
          end_time,
          status,
          booking_reference,
          staff:staff_id (
            first_name,
            last_name
          ),
          services:service_id (
            title,
            cost,
            duration
          )
        `)
        .eq("branch_id", branchId)
        .order("date", { ascending: false })
        .order("start_time", { ascending: false });

      if (error) throw error;

      setAppointments(data as any || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500/10 text-green-700 dark:text-green-400";
      case "scheduled":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
      case "cancelled":
        return "bg-red-500/10 text-red-700 dark:text-red-400";
      case "in_progress":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
      case "no_show":
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400";
      default:
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <p className="text-muted-foreground">No appointments scheduled for this branch yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mobile Card View */}
      <div className="block lg:hidden space-y-4">
        {appointments.map((appointment) => (
          <Card key={appointment.id} className="hover:shadow-xl transition-all hover:scale-[1.02] border-2 hover:border-primary/20">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="text-lg">{appointment.customer_name}</CardTitle>
                <Badge className={getStatusColor(appointment.status)}>
                  {appointment.status.replace("_", " ")}
                </Badge>
              </div>
              {appointment.booking_reference && (
                <CardDescription>Ref: {appointment.booking_reference}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{appointment.services?.title}</span>
                <span className="text-muted-foreground">• ${appointment.services?.cost}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>
                  {appointment.staff?.first_name} {appointment.staff?.last_name}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{new Date(appointment.date).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  {appointment.start_time.slice(0, 5)} - {appointment.end_time.slice(0, 5)}
                </span>
              </div>
              {appointment.customer_email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{appointment.customer_email}</span>
                </div>
              )}
              {appointment.customer_phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{appointment.customer_phone}</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop Table View */}
      <Card className="hidden lg:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Staff</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appointments.map((appointment) => (
                <TableRow key={appointment.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{appointment.customer_name}</p>
                      {appointment.customer_email && (
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {appointment.customer_email}
                        </p>
                      )}
                      {appointment.customer_phone && (
                        <p className="text-xs text-muted-foreground">
                          {appointment.customer_phone}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{appointment.services?.title}</p>
                      <p className="text-xs text-muted-foreground">
                        ${appointment.services?.cost} • {appointment.services?.duration}min
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {appointment.staff?.first_name} {appointment.staff?.last_name}
                  </TableCell>
                  <TableCell>
                    {new Date(appointment.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {appointment.start_time.slice(0, 5)} - {appointment.end_time.slice(0, 5)}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(appointment.status)}>
                      {appointment.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {appointment.booking_reference || "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
