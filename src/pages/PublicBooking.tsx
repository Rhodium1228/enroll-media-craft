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
import { CalendarIcon, Clock, DollarSign, Loader2, MapPin, User } from "lucide-react";
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

  useEffect(() => {
    if (selectedService && selectedDate && selectedTime) {
      fetchAvailableStaff();
    }
  }, [selectedService, selectedDate, selectedTime]);

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
          const appointmentDate = payload.new?.date || payload.old?.date;
          if (appointmentDate === dateStr) {
            toast({
              title: "Availability Updated",
              description: "Time slots have been updated. Please review available times.",
            });
            
            // Refresh time slots and staff availability
            if (selectedService) {
              generateTimeSlots();
            }
            if (selectedService && selectedTime) {
              fetchAvailableStaff();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedBranch, selectedDate, selectedService, selectedTime]);

  useEffect(() => {
    if (selectedDate && selectedBranch && selectedService) {
      generateTimeSlots();
    }
  }, [selectedDate, selectedBranch, selectedService]);

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

      // Fetch staff with date assignments for this date
      const { data: staffAssignments } = await supabase
        .from("staff_date_assignments")
        .select("staff_id, time_slots")
        .eq("branch_id", selectedBranch)
        .eq("date", dateStr);

      // Fetch existing appointments to exclude booked slots
      const { data: appointments } = await supabase
        .from("appointments")
        .select("start_time, end_time, staff_id")
        .eq("branch_id", selectedBranch)
        .eq("date", dateStr)
        .neq("status", "cancelled");

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
        
        // Check if any staff is available at this time
        const hasAvailableStaff = staffAssignments?.some(assignment => {
          const timeSlots = assignment.time_slots as any[];
          return timeSlots?.some(slot => {
            return timeStr >= slot.start && timeStr < slot.end;
          });
        });

        // Check if time slot has enough room for service duration
        const endServiceTime = new Date(currentTime.getTime() + serviceDuration * 60000);
        const fitsInBranchHours = endServiceTime <= endTime;

        if (hasAvailableStaff && fitsInBranchHours) {
          slots.push(timeStr);
        }

        // Increment by 30 minutes
        currentTime.setMinutes(currentTime.getMinutes() + 30);
      }

      setTimeSlots(slots);

      if (slots.length === 0) {
        toast({
          title: "No Availability",
          description: "No time slots available on this date. Please select another date.",
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
    if (!selectedService || !selectedDate || !selectedTime) return;

    try {
      setLoading(true);
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      
      const { data, error } = await supabase.functions.invoke('get-staff-availability', {
        body: { 
          serviceId: selectedService,
          branchId: selectedBranch,
          date: dateStr,
          startTime: selectedTime,
        },
      });

      if (error) throw error;
      setAvailableStaff(data?.staff || []);
    } catch (error: any) {
      console.error("Error fetching staff availability:", error);
      toast({
        title: "Error",
        description: "Failed to check staff availability",
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
      setStep(5);
      
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

  if (step === 5 && bookingReference) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center p-6">
        <Card className="max-w-2xl w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-success/20 rounded-full flex items-center justify-center">
              <CalendarIcon className="h-8 w-8 text-success" />
            </div>
            <CardTitle className="text-2xl">Booking Confirmed!</CardTitle>
            <CardDescription>Your appointment has been successfully scheduled</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-6 space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Booking Reference</p>
                <p className="text-2xl font-bold font-mono">{bookingReference}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Save this reference to manage your booking
                </p>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Service</span>
                  <span className="font-semibold">{selectedServiceDetails?.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-semibold">{selectedDate && format(selectedDate, "PPP")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time</span>
                  <span className="font-semibold">{selectedTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Location</span>
                  <span className="font-semibold">{selectedBranchDetails?.name}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                className="w-full"
                onClick={() => navigate(`/manage-booking`)}
              >
                Manage Booking
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.location.reload()}
              >
                Book Another Appointment
              </Button>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              <p>A confirmation email has been sent to {customerEmail}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Book an Appointment</h1>
          <p className="text-muted-foreground">
            Choose your service and find a time that works for you
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center items-center gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all",
                  step >= s
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {s}
              </div>
              {s < 4 && (
                <div
                  className={cn(
                    "w-12 h-1 mx-1 transition-all",
                    step > s ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </div>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {step === 1 && "Select Location & Service"}
              {step === 2 && "Choose Date & Time"}
              {step === 3 && "Select Stylist (Optional)"}
              {step === 4 && "Your Details"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Branch and Service Selection */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Branch</Label>
                  <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a location" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            {branch.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedBranch && (
                  <div className="space-y-3">
                    <Label>Select Service</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {services.map((service) => (
                        <Card
                          key={service.id}
                          className={cn(
                            "cursor-pointer transition-all hover:shadow-md",
                            selectedService === service.id && "ring-2 ring-primary"
                          )}
                          onClick={() => setSelectedService(service.id)}
                        >
                          <CardContent className="pt-4">
                            <div className="space-y-2">
                              <h3 className="font-semibold">{service.title}</h3>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  {service.duration} min
                                </div>
                                <div className="flex items-center gap-1">
                                  <DollarSign className="h-4 w-4" />
                                  {service.cost}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  className="w-full"
                  disabled={!selectedBranch || !selectedService}
                  onClick={() => setStep(2)}
                >
                  Continue
                </Button>
              </div>
            )}

            {/* Step 2: Date and Time Selection */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !selectedDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
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

                {selectedDate && (
                  <div className="space-y-2">
                    <Label>Select Time</Label>
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-2 max-h-[300px] overflow-y-auto p-2">
                      {timeSlots.map((time) => (
                        <Button
                          key={time}
                          variant={selectedTime === time ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedTime(time)}
                          className="text-sm"
                        >
                          {time}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button
                    className="flex-1"
                    disabled={!selectedDate || !selectedTime}
                    onClick={() => setStep(3)}
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Staff Selection */}
            {step === 3 && (
              <div className="space-y-4">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : availableStaff.length > 0 ? (
                  <>
                    <div className="space-y-3">
                      <Label>Choose Your Stylist (Optional)</Label>
                      <p className="text-sm text-muted-foreground">
                        Or skip to auto-assign the next available stylist
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {availableStaff.map((staff) => (
                          <Card
                            key={staff.id}
                            className={cn(
                              "cursor-pointer transition-all hover:shadow-md",
                              selectedStaff === staff.id && "ring-2 ring-primary"
                            )}
                            onClick={() => setSelectedStaff(staff.id)}
                          >
                            <CardContent className="pt-4">
                              <div className="flex items-center gap-3">
                                <Avatar>
                                  <AvatarImage src={staff.profile_image_url || undefined} />
                                  <AvatarFallback>
                                    {staff.first_name[0]}
                                    {staff.last_name[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-semibold">
                                    {staff.first_name} {staff.last_name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">Available</p>
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
                    <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No stylists available for this time</p>
                    <p className="text-sm mt-1">Please select a different time</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
                    Back
                  </Button>
                  <Button
                    className="flex-1"
                    disabled={availableStaff.length === 0}
                    onClick={() => setStep(4)}
                  >
                    {selectedStaff ? "Continue" : "Auto-Assign & Continue"}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Customer Details */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1234567890"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Additional Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any special requests or information..."
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                {/* Booking Summary */}
                <Card className="bg-muted/50">
                  <CardHeader>
                    <CardTitle className="text-lg">Booking Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Service</span>
                      <span className="font-semibold">{selectedServiceDetails?.title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date</span>
                      <span className="font-semibold">{selectedDate && format(selectedDate, "PPP")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Time</span>
                      <span className="font-semibold">{selectedTime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duration</span>
                      <span className="font-semibold">{selectedServiceDetails?.duration} min</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cost</span>
                      <span className="font-semibold">${selectedServiceDetails?.cost}</span>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setStep(3)}>
                    Back
                  </Button>
                  <Button
                    className="flex-1"
                    disabled={loading || !customerName || !customerEmail}
                    onClick={handleSubmit}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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
