import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { calculateEndTime, getAvailableSlots, TimeSlot } from "@/lib/appointmentUtils";
import { Loader2 } from "lucide-react";
import { StaffAvailabilityPreview } from "./StaffAvailabilityPreview";

interface AppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  prefilledDate?: Date;
  prefilledBranchId?: string;
  prefilledStaffId?: string;
}

interface Branch {
  id: string;
  name: string;
}

interface Staff {
  id: string;
  first_name: string;
  last_name: string;
}

interface Service {
  id: string;
  title: string;
  duration: number;
  cost: number;
}

export const AppointmentDialog = ({
  open,
  onOpenChange,
  onSuccess,
  prefilledDate,
  prefilledBranchId,
  prefilledStaffId,
}: AppointmentDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [step, setStep] = useState(1);

  // Form state
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(prefilledDate);
  const [selectedBranch, setSelectedBranch] = useState<string>(prefilledBranchId || "");
  const [selectedStaff, setSelectedStaff] = useState<string>(prefilledStaffId || "");
  const [selectedService, setSelectedService] = useState<string>("");
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [notes, setNotes] = useState("");

  // Data lists
  const [branches, setBranches] = useState<Branch[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);

  useEffect(() => {
    if (open) {
      fetchBranches();
    }
  }, [open]);

  useEffect(() => {
    if (selectedBranch && selectedDate) {
      fetchStaffForDate();
      // Reset staff selection when branch or date changes
      setSelectedStaff("");
      setSelectedService("");
      setSelectedTimeSlot("");
    }
  }, [selectedBranch, selectedDate]);

  useEffect(() => {
    if (selectedBranch) {
      fetchServicesForStaff();
    }
  }, [selectedBranch]);

  useEffect(() => {
    if (selectedDate && selectedStaff && selectedService) {
      fetchAvailableSlots();
    }
  }, [selectedDate, selectedStaff, selectedService]);

  const fetchBranches = async () => {
    const { data, error } = await supabase
      .from("branches")
      .select("id, name")
      .in("status", ["active", "pending"]);

    if (error) {
      toast({ title: "Error loading branches", variant: "destructive" });
      return;
    }
    setBranches(data || []);
  };

  const fetchStaffForDate = async () => {
    if (!selectedDate || !selectedBranch) return;

    setLoadingStaff(true);
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    
    const { data, error } = await supabase
      .from("staff_date_assignments")
      .select(`
        staff_id,
        staff:staff_id (
          id,
          first_name,
          last_name,
          status
        )
      `)
      .eq("branch_id", selectedBranch)
      .eq("date", dateStr);

    setLoadingStaff(false);

    if (error) {
      toast({ title: "Error loading staff", variant: "destructive" });
      return;
    }

    // Filter out suspended staff
    const activeStaff = data?.filter((item: any) => 
      item.staff && item.staff.status !== 'suspended'
    ) || [];

    const uniqueStaff = Array.from(
      new Map(activeStaff.map((item: any) => [item.staff.id, item.staff])).values()
    );
    setStaff(uniqueStaff as Staff[]);
  };

  const fetchServicesForStaff = async () => {
    if (!selectedBranch) return;

    // Fetch all services for the branch (not filtered by staff)
    const { data, error } = await supabase
      .from("services")
      .select("id, title, duration, cost")
      .eq("branch_id", selectedBranch);

    if (error) {
      toast({ title: "Error loading services", variant: "destructive" });
      return;
    }

    setServices(data || []);
  };

  const fetchAvailableSlots = async () => {
    if (!selectedDate || !selectedStaff || !selectedService) return;

    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const service = services.find(s => s.id === selectedService);
    if (!service) return;

    // Fetch staff assignments for this date
    const { data: assignments, error: assignError } = await supabase
      .from("staff_date_assignments")
      .select("time_slots")
      .eq("staff_id", selectedStaff)
      .eq("branch_id", selectedBranch)
      .eq("date", dateStr)
      .maybeSingle();

    if (assignError || !assignments) {
      setAvailableSlots([]);
      return;
    }

    // Fetch existing appointments
    const { data: appointments, error: appointError } = await supabase
      .from("appointments")
      .select("id, staff_id, branch_id, service_id, customer_name, date, start_time, end_time, status, created_by, created_at, updated_at")
      .eq("staff_id", selectedStaff)
      .eq("date", dateStr)
      .neq("status", "cancelled");

    if (appointError) {
      toast({ title: "Error loading appointments", variant: "destructive" });
      return;
    }

    const staffTimeSlots = (assignments.time_slots as any[]) || [];
    const slots = getAvailableSlots(
      staffTimeSlots,
      (appointments || []) as any,
      service.duration,
      15
    );

    setAvailableSlots(slots);
  };

  const handleSubmit = async () => {
    if (!selectedDate || !selectedBranch || !selectedStaff || !selectedService || !selectedTimeSlot || !customerName) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }

    setLoading(true);

    const service = services.find(s => s.id === selectedService);
    if (!service) return;

    const endTime = calculateEndTime(selectedTimeSlot, service.duration);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from("appointments").insert({
      staff_id: selectedStaff,
      branch_id: selectedBranch,
      service_id: selectedService,
      customer_name: customerName,
      customer_phone: customerPhone || null,
      customer_email: customerEmail || null,
      date: format(selectedDate, "yyyy-MM-dd"),
      start_time: selectedTimeSlot,
      end_time: endTime,
      notes: notes || null,
      created_by: user?.id || "",
    });

    setLoading(false);

    if (error) {
      toast({ title: "Error creating appointment", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Appointment created successfully" });
    onOpenChange(false);
    resetForm();
    onSuccess?.();
  };

  const resetForm = () => {
    setStep(1);
    setSelectedDate(prefilledDate);
    setSelectedBranch(prefilledBranchId || "");
    setSelectedStaff(prefilledStaffId || "");
    setSelectedService("");
    setSelectedTimeSlot("");
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setNotes("");
  };

  const canProceedToStep2 = selectedBranch && selectedDate;
  const canProceedToStep3 = canProceedToStep2 && selectedStaff && selectedService;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Book Appointment</DialogTitle>
          <DialogDescription>
            Select branch, date, staff, and service to book a task appointment for your customer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step 1: Branch and Date */}
          <div className="space-y-4">
            <div>
              <Label>Branch *</Label>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger>
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent className="z-50 bg-popover">
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedBranch && (
              <div className="space-y-4">
                <StaffAvailabilityPreview 
                  branchId={selectedBranch}
                  selectedDate={selectedDate}
                  onDateSelect={setSelectedDate}
                />
              </div>
            )}

            <div>
              <Label>Date *</Label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date < new Date()}
                className="rounded-md border"
              />
            </div>
          </div>

          {/* Step 2: Staff and Service */}
          {canProceedToStep2 && (
            <div className="space-y-4 pt-4 border-t">
              <div>
                <Label>Staff Member *</Label>
                {loadingStaff ? (
                  <div className="p-4 border rounded-md bg-muted/50 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <p className="text-sm text-muted-foreground">Loading available staff...</p>
                  </div>
                ) : staff.length === 0 ? (
                  <div className="p-4 border rounded-md bg-muted/50">
                    <p className="text-sm text-muted-foreground">
                      No staff assigned to this branch on the selected date. Please assign staff to this date first in the Staff Calendar or Branch Schedule.
                    </p>
                  </div>
                ) : (
                  <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select staff" />
                    </SelectTrigger>
                    <SelectContent className="z-50 bg-popover">
                      {staff.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.first_name} {member.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div>
                <Label>Service *</Label>
                {services.length === 0 ? (
                  <div className="p-4 border rounded-md bg-muted/50">
                    <p className="text-sm text-muted-foreground">
                      No services available for this branch. Please add services first.
                    </p>
                  </div>
                ) : (
                  <Select value={selectedService} onValueChange={setSelectedService} disabled={!selectedStaff}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select service" />
                    </SelectTrigger>
                    <SelectContent className="z-50 bg-popover">
                      {services.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.title} ({service.duration} min - ${service.cost})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {selectedService && services.find(s => s.id === selectedService) && (
                <div className="text-sm text-muted-foreground p-3 bg-muted rounded-md">
                  Duration: {services.find(s => s.id === selectedService)?.duration} minutes
                </div>
              )}
            </div>
          )}

          {/* Step 3: Time Slot */}
          {canProceedToStep3 && (
            <div className="space-y-4 pt-4 border-t">
              <div>
                <Label>Available Time Slots *</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-2">
                  {availableSlots.length === 0 ? (
                    <p className="col-span-full text-sm text-muted-foreground">
                      No available slots for this date
                    </p>
                  ) : (
                    availableSlots.map((slot, idx) => (
                      <Button
                        key={idx}
                        variant={selectedTimeSlot === slot.start ? "default" : "outline"}
                        size="sm"
                        className="text-xs sm:text-sm"
                        onClick={() => setSelectedTimeSlot(slot.start)}
                      >
                        {slot.start}
                      </Button>
                    ))
                  )}
                </div>
              </div>

              <div>
                <Label>Customer Name *</Label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter customer name"
                />
              </div>

              <div>
                <Label>Customer Phone</Label>
                <Input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Enter phone number"
                />
              </div>

              <div>
                <Label>Customer Email</Label>
                <Input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="Enter email address"
                />
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Special instructions or notes"
                  rows={3}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading || !canProceedToStep3 || !selectedTimeSlot || !customerName}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Book Appointment
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
