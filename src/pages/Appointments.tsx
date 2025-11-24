import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { ArrowLeft, CalendarPlus, ChevronLeft, ChevronRight, X, Filter, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, subDays, startOfMonth, endOfMonth, addWeeks, subWeeks } from "date-fns";
import { AppointmentTimelineView } from "@/components/appointments/AppointmentTimelineView";
import { AppointmentWeekView } from "@/components/appointments/AppointmentWeekView";
import { AppointmentDialog } from "@/components/appointments/AppointmentDialog";
import { AppointmentCard } from "@/components/appointments/AppointmentCard";
import { AppointmentWithDetails } from "@/lib/appointmentUtils";
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

export default function Appointments() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeView, setActiveView] = useState<"day" | "week" | "month">("day");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [staff, setStaff] = useState<Array<{ id: string; first_name: string; last_name: string }>>([]);
  const [selectedStaff, setSelectedStaff] = useState<string>("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [recentlyUpdated, setRecentlyUpdated] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchBranches();
    fetchStaff();
    fetchAppointments();

    // Real-time subscription with highlighting
    const channel = supabase
      .channel('appointments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
        },
        (payload) => {
          console.log('Appointment change:', payload);
          
          // Add to recently updated set for highlighting
          if (payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
            const appointmentId = payload.new.id as string;
            setRecentlyUpdated((prev) => new Set(prev).add(appointmentId));
            
            // Remove from highlight after 5 seconds
            setTimeout(() => {
              setRecentlyUpdated((prev) => {
                const newSet = new Set(prev);
                newSet.delete(appointmentId);
                return newSet;
              });
            }, 5000);
          }
          
          fetchAppointments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDate, activeView, selectedBranch, selectedStaff]);

  const fetchBranches = async () => {
    const { data, error } = await supabase
      .from("branches")
      .select("id, name")
      .eq("status", "active")
      .order("name");

    if (!error && data) {
      setBranches(data);
    }
  };

  const fetchStaff = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("staff")
        .select("id, first_name, last_name")
        .eq("created_by", user.id)
        .eq("status", "active")
        .order("first_name");

      if (!error && data) {
        setStaff(data);
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  const fetchAppointments = async () => {
    setLoading(true);

    let query = supabase
      .from("appointments")
      .select(`
        *,
        staff:staff_id (
          id,
          first_name,
          last_name,
          profile_image_url
        ),
        service:service_id (
          id,
          title,
          duration,
          cost
        ),
        branch:branch_id (
          id,
          name
        )
      `);

    // Filter by date range based on view
    if (activeView === "day") {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      query = query.eq("date", dateStr);
    } else if (activeView === "week") {
      const weekStart = format(subDays(selectedDate, selectedDate.getDay()), "yyyy-MM-dd");
      const weekEnd = format(addDays(selectedDate, 6 - selectedDate.getDay()), "yyyy-MM-dd");
      query = query.gte("date", weekStart).lte("date", weekEnd);
    } else if (activeView === "month") {
      const monthStart = format(startOfMonth(selectedDate), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(selectedDate), "yyyy-MM-dd");
      query = query.gte("date", monthStart).lte("date", monthEnd);
    }

    // Filter by branch if selected
    if (selectedBranch !== "all") {
      query = query.eq("branch_id", selectedBranch);
    }

    // Filter by staff if selected
    if (selectedStaff !== "all") {
      query = query.eq("staff_id", selectedStaff);
    }

    const { data, error } = await query.order("start_time");

    setLoading(false);

    if (error) {
      toast({ title: "Error loading appointments", variant: "destructive" });
      return;
    }

    // Apply search filter
    let filteredData = data as AppointmentWithDetails[];
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filteredData = filteredData.filter((apt) => {
        return (
          apt.customer_name.toLowerCase().includes(query) ||
          apt.booking_reference?.toLowerCase().includes(query) ||
          apt.customer_email?.toLowerCase().includes(query) ||
          apt.customer_phone?.includes(query) ||
          format(new Date(apt.date), "yyyy-MM-dd").includes(query)
        );
      });
    }

    setAppointments(filteredData);
  };

  const handlePrevious = () => {
    if (activeView === "day") {
      setSelectedDate(subDays(selectedDate, 1));
    } else if (activeView === "week") {
      setSelectedDate(subWeeks(selectedDate, 1));
    } else {
      setSelectedDate(subDays(selectedDate, 30));
    }
  };

  const handleNext = () => {
    if (activeView === "day") {
      setSelectedDate(addDays(selectedDate, 1));
    } else if (activeView === "week") {
      setSelectedDate(addWeeks(selectedDate, 1));
    } else {
      setSelectedDate(addDays(selectedDate, 30));
    }
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const handleDeleteAppointment = async () => {
    if (!appointmentToDelete) return;

    const { error } = await supabase
      .from("appointments")
      .delete()
      .eq("id", appointmentToDelete);

    if (error) {
      toast({ title: "Error deleting appointment", variant: "destructive" });
      return;
    }

    toast({ title: "Appointment deleted" });
    setDeleteDialogOpen(false);
    setAppointmentToDelete(null);
    fetchAppointments();
  };

  const handleUpdateStatus = async (appointmentId: string, status: AppointmentWithDetails['status']) => {
    const { error } = await supabase
      .from("appointments")
      .update({ status })
      .eq("id", appointmentId);

    if (error) {
      toast({ title: "Error updating appointment", variant: "destructive" });
      return;
    }

    toast({ title: "Appointment updated" });
    fetchAppointments();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Gradient Header */}
      <div className="bg-gradient-to-r from-primary via-primary/90 to-accent py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate("/dashboard")}
                className="text-white hover:bg-white/20"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="text-white">
                <h1 className="text-3xl sm:text-4xl font-bold mb-2">Appointments</h1>
                <p className="text-white/90">
                  Manage appointments and bookings
                </p>
              </div>
            </div>
            <Button 
              onClick={() => setDialogOpen(true)}
              className="bg-white text-primary hover:bg-white/90"
            >
              <CalendarPlus className="h-4 w-4 mr-2" />
              New Appointment
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">

        {/* Filters and Search */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={handlePrevious}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={handleToday}>
                Today
              </Button>
              <Button variant="outline" size="icon" onClick={handleNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="font-semibold">
              {activeView === "day" && format(selectedDate, "EEEE, MMMM d, yyyy")}
              {activeView === "week" && `Week of ${format(selectedDate, "MMM d, yyyy")}`}
              {activeView === "month" && format(selectedDate, "MMMM yyyy")}
            </div>

            <div className="flex items-center gap-2 ml-auto flex-wrap">
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className={`w-48 ${selectedBranch !== "all" ? "border-primary" : ""}`}>
                <SelectValue placeholder="All branches" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-popover">
                <SelectItem value="all">All branches</SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStaff} onValueChange={setSelectedStaff}>
              <SelectTrigger className={`w-48 ${selectedStaff !== "all" ? "border-primary" : ""}`}>
                <SelectValue placeholder="All staff" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-popover">
                <SelectItem value="all">All staff</SelectItem>
                {staff.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.first_name} {member.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(selectedBranch !== "all" || selectedStaff !== "all") && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setSelectedBranch("all");
                  setSelectedStaff("all");
                }}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Clear Filters
              </Button>
            )}

              {(selectedBranch !== "all" || selectedStaff !== "all") && (
                <Badge variant="secondary" className="gap-1">
                  <Filter className="h-3 w-3" />
                  {[selectedBranch !== "all" && "Branch", selectedStaff !== "all" && "Staff"].filter(Boolean).join(", ")}
                </Badge>
              )}
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by customer name, booking reference, email, phone, or date..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Views */}
        <Tabs value={activeView} onValueChange={(v) => setActiveView(v as any)}>
          <TabsList>
            <TabsTrigger value="day">Day</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
          </TabsList>

          <TabsContent value="day" className="mt-6">
            {loading ? (
              <div className="flex items-center justify-center h-64">Loading...</div>
            ) : (
              <AppointmentTimelineView
                appointments={appointments}
                date={selectedDate}
                onAppointmentClick={(apt) => console.log("View appointment", apt)}
                onStatusUpdate={fetchAppointments}
                recentlyUpdated={recentlyUpdated}
              />
            )}
          </TabsContent>

          <TabsContent value="week" className="mt-6">
            {loading ? (
              <div className="flex items-center justify-center h-64">Loading...</div>
            ) : (
              <AppointmentWeekView
                appointments={appointments}
                currentDate={selectedDate}
                onAppointmentClick={(apt) => console.log("View appointment", apt)}
                onDayClick={(date) => {
                  setSelectedDate(date);
                  setActiveView("day");
                }}
              />
            )}
          </TabsContent>

          <TabsContent value="month" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  className="rounded-md border"
                />
              </div>
              <div className="space-y-4">
                <h3 className="font-semibold">
                  Appointments for {format(selectedDate, "MMMM d, yyyy")}
                </h3>
                {loading ? (
                  <div className="flex items-center justify-center h-32">Loading...</div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {appointments
                      .filter((apt) => apt.date === format(selectedDate, "yyyy-MM-dd"))
                      .map((appointment) => (
                        <AppointmentCard
                          key={appointment.id}
                          appointment={appointment}
                          onDelete={(id) => {
                            setAppointmentToDelete(id);
                            setDeleteDialogOpen(true);
                          }}
                          onUpdateStatus={handleUpdateStatus}
                          isRecentlyUpdated={recentlyUpdated.has(appointment.id)}
                        />
                      ))}
                    {appointments.filter((apt) => apt.date === format(selectedDate, "yyyy-MM-dd")).length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No appointments for this date
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <AppointmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={fetchAppointments}
        prefilledDate={selectedDate}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Appointment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this appointment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAppointment}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
