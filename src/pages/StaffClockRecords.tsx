import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Clock, MapPin, Calendar, User, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { toast } from "sonner";

interface ClockRecord {
  id: string;
  staff_id: string;
  branch_id: string;
  clock_in_time: string;
  clock_out_time: string | null;
  clock_in_latitude: number | null;
  clock_in_longitude: number | null;
  clock_out_latitude: number | null;
  clock_out_longitude: number | null;
  status: string;
  notes: string | null;
  staff: {
    first_name: string;
    last_name: string;
  };
  branches: {
    name: string;
  };
}

export default function StaffClockRecords() {
  const [records, setRecords] = useState<ClockRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClockRecords();
    
    // Set up realtime subscription
    const channel = supabase
      .channel('clock-records-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'staff_clock_records'
        },
        () => {
          fetchClockRecords();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchClockRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('staff_clock_records')
        .select(`
          *,
          staff:staff_id (first_name, last_name),
          branches:branch_id (name)
        `)
        .order('clock_in_time', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (error: any) {
      console.error('Error fetching clock records:', error);
      toast.error('Failed to load clock records');
    } finally {
      setLoading(false);
    }
  };

  const calculateDuration = (clockIn: string, clockOut: string | null) => {
    if (!clockOut) return 'Active';
    
    const start = new Date(clockIn);
    const end = new Date(clockOut);
    const diffMs = end.getTime() - start.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  const openMapLocation = (lat: number | null, lng: number | null) => {
    if (lat && lng) {
      window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary via-primary/90 to-accent p-8 rounded-xl shadow-xl text-white">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="h-8 w-8" />
            <h1 className="text-3xl font-bold">Staff Clock Records</h1>
          </div>
          <p className="text-white/90">Monitor staff clock in/out times and locations</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:shadow-xl transition-all hover:scale-[1.02] border-2 hover:border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Records</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{records.length}</div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-xl transition-all hover:scale-[1.02] border-2 hover:border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Currently Clocked In</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {records.filter(r => r.status === 'clocked_in').length}
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-xl transition-all hover:scale-[1.02] border-2 hover:border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Records</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {records.filter(r => 
                  format(new Date(r.clock_in_time), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                ).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Records Table */}
        <Card className="hover:shadow-xl transition-all border-2">
          <CardHeader>
            <CardTitle>Clock Records</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {records.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No clock records found
                </div>
              ) : (
                records.map((record) => (
                  <Card key={record.id} className="border-2">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="font-medium truncate">
                              {record.staff.first_name} {record.staff.last_name}
                            </span>
                          </div>
                          <Badge variant={record.status === 'clocked_in' ? 'default' : 'secondary'}>
                            {record.status === 'clocked_in' ? 'Active' : 'Completed'}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                          <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="truncate">{record.branches.name}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-3 border-t">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Clock In</p>
                            <div className="flex flex-col">
                              <span className="font-medium text-sm">
                                {format(new Date(record.clock_in_time), 'HH:mm')}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(record.clock_in_time), 'dd/MM/yyyy')}
                              </span>
                            </div>
                          </div>

                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Clock Out</p>
                            {record.clock_out_time ? (
                              <div className="flex flex-col">
                                <span className="font-medium text-sm">
                                  {format(new Date(record.clock_out_time), 'HH:mm')}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(record.clock_out_time), 'dd/MM/yyyy')}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Duration</p>
                            <p className="font-medium text-sm">
                              {calculateDuration(record.clock_in_time, record.clock_out_time)}
                            </p>
                          </div>

                          <div className="flex gap-2">
                            {record.clock_in_latitude && record.clock_in_longitude && (
                              <button
                                onClick={() => openMapLocation(record.clock_in_latitude, record.clock_in_longitude)}
                                className="p-2 hover:bg-accent rounded-lg transition-colors border"
                                title="Clock In Location"
                              >
                                <MapPin className="h-4 w-4 text-green-600" />
                              </button>
                            )}
                            {record.clock_out_latitude && record.clock_out_longitude && (
                              <button
                                onClick={() => openMapLocation(record.clock_out_latitude, record.clock_out_longitude)}
                                className="p-2 hover:bg-accent rounded-lg transition-colors border"
                                title="Clock Out Location"
                              >
                                <MapPin className="h-4 w-4 text-red-600" />
                              </button>
                            )}
                            {!record.clock_in_latitude && !record.clock_out_latitude && (
                              <span className="text-xs text-muted-foreground py-2">No GPS</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Clock In</TableHead>
                    <TableHead>Clock Out</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Location</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No clock records found
                      </TableCell>
                    </TableRow>
                  ) : (
                    records.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            {record.staff.first_name} {record.staff.last_name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            {record.branches.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {format(new Date(record.clock_in_time), 'HH:mm')}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(record.clock_in_time), 'dd/MM/yyyy')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {record.clock_out_time ? (
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {format(new Date(record.clock_out_time), 'HH:mm')}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(record.clock_out_time), 'dd/MM/yyyy')}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {calculateDuration(record.clock_in_time, record.clock_out_time)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={record.status === 'clocked_in' ? 'default' : 'secondary'}>
                            {record.status === 'clocked_in' ? 'Active' : 'Completed'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {record.clock_in_latitude && record.clock_in_longitude && (
                              <button
                                onClick={() => openMapLocation(record.clock_in_latitude, record.clock_in_longitude)}
                                className="p-1 hover:bg-accent rounded transition-colors"
                                title="Clock In Location"
                              >
                                <MapPin className="h-4 w-4 text-green-600" />
                              </button>
                            )}
                            {record.clock_out_latitude && record.clock_out_longitude && (
                              <button
                                onClick={() => openMapLocation(record.clock_out_latitude, record.clock_out_longitude)}
                                className="p-1 hover:bg-accent rounded transition-colors"
                                title="Clock Out Location"
                              >
                                <MapPin className="h-4 w-4 text-red-600" />
                              </button>
                            )}
                            {!record.clock_in_latitude && !record.clock_out_latitude && (
                              <span className="text-xs text-muted-foreground">No GPS</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}