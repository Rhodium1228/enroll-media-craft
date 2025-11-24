import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { format, addDays } from "date-fns";
import { CalendarIcon, Clock, DollarSign, Loader2, MapPin, User, Calendar as CalendarIconLarge, Scissors } from "lucide-react";
import { cn } from "@/lib/utils";
import { z } from "zod";

const customerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().email("Invalid email address").max(255),
  phone: z.string().trim().min(10, "Phone must be at least 10 digits").max(20).optional(),
});

interface Branch {
  id: string;
  name: string;
  address: string;
}

interface Service {
  id: string;
  title: string;
  duration: number;
  cost: number;
  branch_id: string;
  image_url?: string;
}

interface Staff {
  id: string;
  first_name: string;
  last_name: string;
  profile_image_url: string | null;
}

export default function PublicBooking() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [availableStaff, setAvailableStaff] = useState<Staff[]>([]);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  
  // Form data
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedStaff, setSelectedStaff] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  
  const [bookingReference, setBookingReference] = useState("");

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    if (selectedBranch) {
      fetchServices();
    }
  }, [selectedBranch]);

  // Fetch staff when service is selected
  useEffect(() => {
    if (selectedService && selectedBranch) {
      fetchAvailableStaff();
    }
  }, [selectedService, selectedBranch]);

  // Real-time subscription for appointment changes
  useEffect(() => {
    if (!selectedBranch || !selectedDate) return;

    const dateStr = format(selectedDate, "yyyy-MM-dd");

    const channel = supabase
      .channel('appointments-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `branch_id=eq.${selectedBranch}`,
        },
        (payload) => {
          console.log('Appointment change detected:', payload);
          
          // Check if the change affects the currently selected date
          const newRecord = payload.new as any;
          const oldRecord = payload.old as any;
          const appointmentDate = newRecord?.date || oldRecord?.date;
          
          if (appointmentDate === dateStr) {
            toast({
              title: "Availability Updated",
              description: "Time slots have been updated. Please review available times.",
            });
            
            // Refresh time slots
            if (selectedService) {
              generateTimeSlots();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedBranch, selectedDate, selectedService]);

  // Generate time slots when date, branch, service, and optionally staff are selected
  useEffect(() => {
    if (selectedDate && selectedBranch && selectedService) {
      generateTimeSlots();
    }
  }, [selectedDate, selectedBranch, selectedService, selectedStaff]);

  const fetchBranches = async () => {
    try {
      const { data, error } = await supabase
        .from("branches")
        .select("id, name, address")
        .eq("status", "active");

      if (error) throw error;
      setBranches(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load branches",
        variant: "destructive",
      });
    }
  };

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("branch_id", selectedBranch);

      if (error) throw error;
      setServices(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load services",
        variant: "destructive",
      });
    }
  };

  const generateTimeSlots = async () => {
    if (!selectedDate || !selectedBranch || !selectedService) return;

    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const dayOfWeek = format(selectedDate, "EEEE").toLowerCase();

      // Fetch branch details with operating hours
      const { data: branch, error: branchError } = await supabase
        .from("branches")
        .select("open_hours")
        .eq("id", selectedBranch)
        .single();

      if (branchError) throw branchError;

      // Check for date-specific branch overrides
      const { data: branchOverride } = await supabase
        .from("branch_schedule_overrides")
        .select("*")
        .eq("branch_id", selectedBranch)
        .eq("date", dateStr)
        .maybeSingle();

      // Check if branch is closed on this date
      if (branchOverride?.override_type === "closed") {
        setTimeSlots([]);
        toast({
          title: "Branch Closed",
          description: `The selected location is closed on ${format(selectedDate, "PPP")}`,
          variant: "destructive",
        });
        return;
      }

      // Get branch hours (from override or regular schedule)
      let openTime = "09:00";
      let closeTime = "17:00";

      if (branchOverride?.override_type === "custom_hours" && branchOverride.time_slots) {
        const customSlots = branchOverride.time_slots as any[];
        if (customSlots.length > 0) {
          openTime = customSlots[0].start;
          closeTime = customSlots[customSlots.length - 1].end;
        }
      } else if (branch?.open_hours) {
        const hours = branch.open_hours as any;
        const dayHours = hours[dayOfWeek];
        if (dayHours && dayHours.open && dayHours.close) {
          openTime = dayHours.open;
          closeTime = dayHours.close;
        }
      }

      // Build query for staff assignments - filter by selected staff if chosen
      let assignmentsQuery = supabase
        .from("staff_date_assignments")
        .select("staff_id, time_slots")
        .eq("branch_id", selectedBranch)
        .eq("date", dateStr);
      
      if (selectedStaff) {
        assignmentsQuery = assignmentsQuery.eq("staff_id", selectedStaff);
      }

      const { data: staffAssignments } = await assignmentsQuery;

      // Fetch existing appointments - filter by selected staff if chosen
      let appointmentsQuery = supabase
        .from("appointments")
        .select("start_time, end_time, staff_id")
        .eq("branch_id", selectedBranch)
        .eq("date", dateStr)
        .neq("status", "cancelled");
      
      if (selectedStaff) {
        appointmentsQuery = appointmentsQuery.eq("staff_id", selectedStaff);
      }

      const { data: appointments } = await appointmentsQuery;

      // Get service duration
      const service = services.find(s => s.id === selectedService);
      const serviceDuration = service?.duration || 60;

      // Generate time slots based on branch hours
      const slots = [];
      const [openHour, openMinute] = openTime.split(":").map(Number);
      const [closeHour, closeMinute] = closeTime.split(":").map(Number);

      let currentTime = new Date();
      currentTime.setHours(openHour, openMinute, 0, 0);

      const endTime = new Date();
      endTime.setHours(closeHour, closeMinute, 0, 0);

      while (currentTime < endTime) {
        const timeStr = format(currentTime, "HH:mm");
        
        // Check if staff is available at this time
        const hasAvailableStaff = staffAssignments?.some(assignment => {
          const timeSlots = assignment.time_slots as any[];
          return timeSlots?.some(slot => {
            return timeStr >= slot.start && timeStr < slot.end;
          });
        });

        // Check if this time slot is already booked
        const endServiceTime = new Date(currentTime.getTime() + serviceDuration * 60000);
        const isBooked = appointments?.some(appt => {
          return timeStr >= appt.start_time && timeStr < appt.end_time;
        });

        // Check if time slot has enough room for service duration
        const fitsInBranchHours = endServiceTime <= endTime;

        if (hasAvailableStaff && !isBooked && fitsInBranchHours) {
          slots.push(timeStr);
        }

        // Increment by 30 minutes
        currentTime.setMinutes(currentTime.getMinutes() + 30);
      }

      setTimeSlots(slots);

      if (slots.length === 0) {
        toast({
          title: "No Availability",
          description: selectedStaff 
            ? "This stylist has no available slots on this date. Try another date or stylist."
            : "No time slots available on this date. Please select another date.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error generating time slots:", error);
      toast({
        title: "Error",
        description: "Failed to load available time slots",
        variant: "destructive",
      });
    }
  };

  const fetchAvailableStaff = async () => {
    if (!selectedService || !selectedBranch) return;

    try {
      setLoading(true);
      
      // Fetch staff who can provide this service at this branch
      const { data, error } = await supabase
        .from("staff_services")
        .select(`
          staff:staff_id (
            id,
            first_name,
            last_name,
            profile_image_url,
            status
          )
        `)
        .eq("service_id", selectedService)
        .eq("branch_id", selectedBranch);

      if (error) throw error;
      
      // Extract and filter active staff
      const staff = data
        ?.map((item: any) => item.staff)
        .filter((s: any) => s && s.status === 'active') || [];
      
      setAvailableStaff(staff);
    } catch (error: any) {
      console.error("Error fetching staff:", error);
      toast({
        title: "Error",
        description: "Failed to load available stylists",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    // Validate customer details
    try {
      customerSchema.parse({
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
      });
    } catch (error: any) {
      toast({
        title: "Validation Error",
        description: error.errors[0]?.message || "Please check your input",
        variant: "destructive",
      });
      return;
    }

    if (!selectedBranch || !selectedService || !selectedDate || !selectedTime) {
      toast({
        title: "Incomplete",
        description: "Please complete all booking steps",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      
      const { data, error } = await supabase.functions.invoke('create-public-booking', {
        body: {
          branchId: selectedBranch,
          serviceId: selectedService,
          staffId: selectedStaff || null,
          date: dateStr,
          startTime: selectedTime,
          customerName,
          customerEmail,
          customerPhone: customerPhone || null,
          notes: notes || null,
        },
      });

      if (error) throw error;

      setBookingReference(data.booking.booking_reference);
      setStep(6);
      
      toast({
        title: "Success!",
        description: "Your appointment has been booked",
      });
    } catch (error: any) {
      console.error("Booking error:", error);
      toast({
        title: "Booking Failed",
        description: error.message || "Failed to create booking",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedServiceDetails = services.find(s => s.id === selectedService);
  const selectedBranchDetails = branches.find(b => b.id === selectedBranch);

  if (step === 6 && bookingReference) {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-gradient-to-r from-primary via-primary/90 to-primary/70 text-primary-foreground">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <CalendarIconLarge className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Booking Confirmation</h1>
                <p className="text-primary-foreground/80 text-sm">
                  Your appointment has been successfully scheduled
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-6 py-8">
          <Card className="shadow-lg border-0">
            <CardHeader className="text-center border-b bg-muted/30">
              <div className="mx-auto mb-4 w-20 h-20 bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-2xl flex items-center justify-center">
                <CalendarIcon className="h-10 w-10 text-green-600" />
              </div>
              <CardTitle className="text-3xl text-green-600">Booking Confirmed!</CardTitle>
              <CardDescription className="text-base mt-2">Your appointment has been successfully scheduled</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-6 space-y-4 border-2 border-primary/20">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground font-medium mb-1">Booking Reference</p>
                  <p className="text-3xl font-bold font-mono text-primary">{bookingReference}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Save this reference to manage your booking
                  </p>
                </div>
                
                <Separator className="bg-border/50" />
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2">
                    <span className="text-muted-foreground font-medium">Service</span>
                    <span className="font-semibold text-lg">{selectedServiceDetails?.title}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-muted-foreground font-medium">Date</span>
                    <span className="font-semibold text-lg">{selectedDate && format(selectedDate, "PPP")}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-muted-foreground font-medium">Time</span>
                    <span className="font-semibold text-lg">{selectedTime}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-muted-foreground font-medium">Location</span>
                    <span className="font-semibold text-lg">{selectedBranchDetails?.name}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  className="w-full h-12 text-base shadow-lg"
                  onClick={() => navigate(`/manage-booking`)}
                >
                  Manage Booking
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-12 text-base"
                  onClick={() => window.location.reload()}
                >
                  Book Another Appointment
                </Button>
              </div>

              <div className="text-center text-sm text-muted-foreground bg-muted/30 rounded-lg p-4">
                <p>A confirmation email has been sent to <span className="font-semibold">{customerEmail}</span></p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Gradient Header Banner */}
      <div className="bg-gradient-to-r from-primary via-primary/90 to-primary/70 text-primary-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
              <CalendarIconLarge className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold truncate">Book an Appointment</h1>
              <p className="text-primary-foreground/80 text-xs sm:text-sm truncate">
                Choose your service and find a time that works for you
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-4 sm:space-y-6">
        {/* Progress Steps */}
        <div className="flex justify-center items-center gap-1 sm:gap-2 overflow-x-auto">
          {[1, 2, 3, 4, 5].map((s) => (
            <div key={s} className="flex items-center flex-shrink-0">
              <div
                className={cn(
                  "w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold transition-all",
                  step >= s
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {s}
              </div>
              {s < 5 && (
                <div
                  className={cn(
                    "w-12 h-1 mx-1 transition-all rounded-full",
                    step > s ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </div>
          ))}
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="border-b bg-muted/30 p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg lg:text-xl">
              {step === 1 && (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  Select Location
                </div>
              )}
              {step === 2 && (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Scissors className="h-4 w-4 text-primary" />
                  </div>
                  Select Service
                </div>
              )}
              {step === 3 && (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  Choose Your Stylist
                </div>
              )}
              {step === 4 && (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                  Pick Date & Time
                </div>
              )}
              {step === 5 && (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  Your Details
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6 pt-4 sm:pt-6 p-4 sm:p-6">
            {/* Step 1: Branch Selection */}
            {step === 1 && (
              <div className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {branches.map((branch) => (
                    <Card
                      key={branch.id}
                      className={cn(
                        "cursor-pointer transition-all hover:shadow-md border-2",
                        selectedBranch === branch.id 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:border-primary/50"
                      )}
                      onClick={() => setSelectedBranch(branch.id)}
                    >
                      <CardContent className="pt-4 sm:pt-6 p-4 sm:p-6">
                        <div className="space-y-2 sm:space-y-3">
                          <div className="flex items-start gap-2 sm:gap-3">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0">
                              <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-sm sm:text-base lg:text-lg truncate">{branch.name}</h3>
                              <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2">{branch.address}</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Button
                  className="w-full h-10 sm:h-12 text-sm sm:text-base"
                  disabled={!selectedBranch}
                  onClick={() => setStep(2)}
                >
                  Continue to Services
                </Button>
              </div>
            )}

            {/* Step 2: Service Selection */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {services.map((service) => (
                    <Card
                      key={service.id}
                      className={cn(
                        "cursor-pointer transition-all hover:shadow-md border-2 overflow-hidden",
                        selectedService === service.id 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:border-primary/50"
                      )}
                      onClick={() => setSelectedService(service.id)}
                    >
                      {service.image_url && (
                        <div className="w-full h-40 overflow-hidden bg-muted">
                          <img
                            src={service.image_url}
                            alt={service.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1">
                              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0">
                                <Scissors className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-lg">{service.title}</h3>
                                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                                  <Clock className="h-3 w-3" />
                                  {service.duration} mins
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-primary">${service.cost}</div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 h-12" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button
                    className="flex-1 h-12 text-base"
                    disabled={!selectedService}
                    onClick={() => setStep(3)}
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Staff Selection */}
            {step === 3 && (
              <div className="space-y-6">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : availableStaff.length > 0 ? (
                  <>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-base">Choose Your Stylist (Optional)</Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Select a preferred stylist or skip to auto-assign
                        </p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {availableStaff.map((staff) => (
                          <Card
                            key={staff.id}
                            className={cn(
                              "cursor-pointer transition-all hover:shadow-md border-2",
                              selectedStaff === staff.id 
                                ? "border-primary bg-primary/5" 
                                : "border-border hover:border-primary/50"
                            )}
                            onClick={() => setSelectedStaff(staff.id)}
                          >
                            <CardContent className="pt-6">
                              <div className="flex items-center gap-4">
                                <Avatar className="w-12 h-12">
                                  <AvatarImage src={staff.profile_image_url || undefined} />
                                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                                    {staff.first_name[0]}
                                    {staff.last_name[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <p className="font-semibold text-base">
                                    {staff.first_name} {staff.last_name}
                                  </p>
                                  <Badge variant="secondary" className="mt-1 text-xs">
                                    Available
                                  </Badge>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                      <User className="h-8 w-8" />
                    </div>
                    <p className="font-medium">No stylists offer this service</p>
                    <p className="text-sm mt-1">Please contact the branch directly</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 h-12" onClick={() => setStep(2)}>
                    Back
                  </Button>
                  <Button
                    className="flex-1 h-12 text-base"
                    disabled={availableStaff.length === 0}
                    onClick={() => setStep(4)}
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Date and Time Selection */}
            {step === 4 && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-base">Select Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full h-12 justify-start text-left font-normal text-base",
                          !selectedDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-5 w-5" />
                        {selectedDate ? format(selectedDate, "PPPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        disabled={(date) => date < new Date()}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {selectedDate && timeSlots.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-base">Select Time</Label>
                    <div className="grid grid-cols-3 md:grid-cols-5 gap-2 max-h-[320px] overflow-y-auto p-1 border rounded-lg">
                      {timeSlots.map((time) => (
                        <Button
                          key={time}
                          variant={selectedTime === time ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedTime(time)}
                          className={cn(
                            "text-sm font-medium h-10",
                            selectedTime === time && "shadow-lg"
                          )}
                        >
                          {time}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 h-12" onClick={() => setStep(3)}>
                    Back
                  </Button>
                  <Button
                    className="flex-1 h-12 text-base"
                    disabled={!selectedDate || !selectedTime}
                    onClick={() => setStep(5)}
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {/* Step 5: Customer Details */}
            {step === 5 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-base">Full Name *</Label>
                    <Input
                      id="name"
                      placeholder="John Doe"
                      className="h-11"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-base">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      className="h-11"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-base">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1234567890"
                      className="h-11"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes" className="text-base">Additional Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Any special requests or information..."
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </div>

                {/* Booking Summary */}
                <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                        <CalendarIcon className="h-4 w-4 text-primary" />
                      </div>
                      Booking Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-border/50">
                      <span className="text-muted-foreground text-sm">Service</span>
                      <span className="font-semibold">{selectedServiceDetails?.title}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border/50">
                      <span className="text-muted-foreground text-sm">Date</span>
                      <span className="font-semibold">{selectedDate && format(selectedDate, "PPP")}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border/50">
                      <span className="text-muted-foreground text-sm">Time</span>
                      <span className="font-semibold">{selectedTime}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border/50">
                      <span className="text-muted-foreground text-sm">Duration</span>
                      <span className="font-semibold">{selectedServiceDetails?.duration} mins</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-muted-foreground text-sm">Cost</span>
                      <span className="font-bold text-xl text-primary">${selectedServiceDetails?.cost}</span>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 h-12" onClick={() => setStep(4)}>
                    Back
                  </Button>
                  <Button
                    className="flex-1 h-12 text-base shadow-lg"
                    disabled={loading || !customerName || !customerEmail}
                    onClick={handleSubmit}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Booking...
                      </>
                    ) : (
                      "Confirm Booking"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
