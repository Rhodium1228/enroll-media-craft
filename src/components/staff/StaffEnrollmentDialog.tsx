import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload, X, AlertTriangle } from "lucide-react";
import StaffScheduleBuilder from "./StaffScheduleBuilder";
import browserImageCompression from "browser-image-compression";
import { detectScheduleConflicts, groupConflictsByDay } from "@/lib/scheduleConflicts";
import type { ScheduleConflict } from "@/lib/scheduleConflicts";
import DateScheduleOverride from "../calendar/DateScheduleOverride";
import LeaveRequestManager from "../calendar/LeaveRequestManager";
import ScheduleOverrideList from "../calendar/ScheduleOverrideList";

interface Staff {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  profile_image_url: string | null;
  status: string;
}

interface Service {
  id: string;
  title: string;
}

interface StaffEnrollmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  staff?: Staff | null;
}

export default function StaffEnrollmentDialog({
  open,
  onOpenChange,
  branchId,
  staff,
}: StaffEnrollmentDialogProps) {
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    status: "active",
  });

  const [workingHours, setWorkingHours] = useState<any>({
    monday: { slots: [{ start: "09:00", end: "17:00" }] },
    tuesday: { slots: [{ start: "09:00", end: "17:00" }] },
    wednesday: { slots: [{ start: "09:00", end: "17:00" }] },
    thursday: { slots: [{ start: "09:00", end: "17:00" }] },
    friday: { slots: [{ start: "09:00", end: "17:00" }] },
    saturday: { closed: true, slots: [] },
    sunday: { closed: true, slots: [] },
  });

  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [scheduleConflicts, setScheduleConflicts] = useState<ScheduleConflict[]>([]);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [checkingConflicts, setCheckingConflicts] = useState(false);

  useEffect(() => {
    if (open) {
      fetchServices();
      if (staff) {
        loadStaffData();
      } else {
        resetForm();
      }
    }
  }, [open, staff, branchId]);

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from("services")
        .select("id, title")
        .eq("branch_id", branchId)
        .order("title");

      if (error) throw error;
      setServices(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const loadStaffData = async () => {
    if (!staff) return;

    setFormData({
      firstName: staff.first_name,
      lastName: staff.last_name,
      email: staff.email,
      phone: staff.phone,
      status: staff.status,
    });

    setProfileImagePreview(staff.profile_image_url);

    try {
      const { data: branchData } = await supabase
        .from("staff_branches")
        .select("working_hours")
        .eq("staff_id", staff.id)
        .eq("branch_id", branchId)
        .single();

      if (branchData?.working_hours) {
        setWorkingHours(branchData.working_hours);
      }

      const { data: servicesData } = await supabase
        .from("staff_services")
        .select("service_id")
        .eq("staff_id", staff.id)
        .eq("branch_id", branchId);

      if (servicesData) {
        setSelectedServices(servicesData.map((s) => s.service_id));
      }
    } catch (error: any) {
      console.error("Error loading staff data:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      status: "active",
    });
    setWorkingHours({
      monday: { slots: [{ start: "09:00", end: "17:00" }] },
      tuesday: { slots: [{ start: "09:00", end: "17:00" }] },
      wednesday: { slots: [{ start: "09:00", end: "17:00" }] },
      thursday: { slots: [{ start: "09:00", end: "17:00" }] },
      friday: { slots: [{ start: "09:00", end: "17:00" }] },
      saturday: { closed: true, slots: [] },
      sunday: { closed: true, slots: [] },
    });
    setSelectedServices([]);
    setProfileImage(null);
    setProfileImagePreview(null);
    setScheduleConflicts([]);
  };

  const checkScheduleConflicts = async (staffId: string): Promise<ScheduleConflict[]> => {
    try {
      setCheckingConflicts(true);

      // Fetch all branches where this staff member is assigned
      const { data: staffBranches, error: branchesError } = await supabase
        .from("staff_branches")
        .select(`
          branch_id,
          working_hours,
          branches:branch_id (
            id,
            name
          )
        `)
        .eq("staff_id", staffId);

      if (branchesError) throw branchesError;

      // Format the data for conflict detection
      const existingSchedules = (staffBranches || []).map((sb: any) => ({
        branch_id: sb.branch_id,
        branch_name: sb.branches?.name || "Unknown Branch",
        working_hours: sb.working_hours,
      }));

      // Detect conflicts between new schedule and existing schedules
      const conflicts = detectScheduleConflicts(workingHours, existingSchedules, branchId);

      return conflicts;
    } catch (error: any) {
      console.error("Error checking schedule conflicts:", error);
      return [];
    } finally {
      setCheckingConflicts(false);
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressedFile = await browserImageCompression(file, {
        maxSizeMB: 0.2,
        maxWidthOrHeight: 512,
        useWebWorker: true,
      });

      setProfileImage(compressedFile);
      setProfileImagePreview(URL.createObjectURL(compressedFile));
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to process image",
        variant: "destructive",
      });
    }
  };

  const uploadProfileImage = async (staffId: string): Promise<string | null> => {
    if (!profileImage) return null;

    try {
      const fileName = `${staffId}-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("staff-profiles")
        .upload(fileName, profileImage);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("staff-profiles")
        .getPublicUrl(fileName);

      return data.publicUrl;
    } catch (error: any) {
      console.error("Error uploading image:", error);
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Check for schedule conflicts if editing existing staff
    if (staff?.id) {
      const conflicts = await checkScheduleConflicts(staff.id);
      if (conflicts.length > 0) {
        setScheduleConflicts(conflicts);
        setShowConflictDialog(true);
        return;
      }
    }

    await performSave();
  };

  const performSave = async () => {

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let staffId = staff?.id;
      let profileImageUrl = staff?.profile_image_url || null;

      if (staff) {
        // Update existing staff
        if (profileImage) {
          profileImageUrl = await uploadProfileImage(staff.id);
        }

        const { error: updateError } = await supabase
          .from("staff")
          .update({
            first_name: formData.firstName,
            last_name: formData.lastName,
            email: formData.email,
            phone: formData.phone,
            status: formData.status,
            profile_image_url: profileImageUrl,
          })
          .eq("id", staff.id);

        if (updateError) throw updateError;
      } else {
        // Create new staff
        const { data: newStaff, error: createError } = await supabase
          .from("staff")
          .insert({
            first_name: formData.firstName,
            last_name: formData.lastName,
            email: formData.email,
            phone: formData.phone,
            status: formData.status,
            created_by: user.id,
          })
          .select()
          .single();

        if (createError) throw createError;
        staffId = newStaff.id;

        if (profileImage) {
          profileImageUrl = await uploadProfileImage(staffId);
          await supabase
            .from("staff")
            .update({ profile_image_url: profileImageUrl })
            .eq("id", staffId);
        }
      }

      // Update staff_branches
      const { error: branchError } = await supabase
        .from("staff_branches")
        .upsert({
          staff_id: staffId,
          branch_id: branchId,
          working_hours: workingHours,
        });

      if (branchError) throw branchError;

      // Update staff_services
      await supabase
        .from("staff_services")
        .delete()
        .eq("staff_id", staffId)
        .eq("branch_id", branchId);

      if (selectedServices.length > 0) {
        const { error: servicesError } = await supabase
          .from("staff_services")
          .insert(
            selectedServices.map((serviceId) => ({
              staff_id: staffId,
              service_id: serviceId,
              branch_id: branchId,
            }))
          );

        if (servicesError) throw servicesError;
      }

      toast({
        title: "Success",
        description: staff ? "Staff member updated" : "Staff member enrolled",
      });

      onOpenChange(false);
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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{staff ? "Edit Staff Member" : "Enroll New Staff"}</DialogTitle>
            <DialogDescription>
              {staff ? "Update staff information and schedule" : "Add a new staff member to this branch"}
            </DialogDescription>
          </DialogHeader>

        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="personal">Personal Info</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="overrides" disabled={!staff?.id}>Date Overrides</TabsTrigger>
            <TabsTrigger value="leave" disabled={!staff?.id}>Leave</TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Doe"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john.doe@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1234567890"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="on_leave">On Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Profile Image (Optional)</Label>
              {profileImagePreview ? (
                <div className="relative w-32 h-32">
                  <img
                    src={profileImagePreview}
                    alt="Profile preview"
                    className="w-32 h-32 rounded-full object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2"
                    onClick={() => {
                      setProfileImage(null);
                      setProfileImagePreview(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" asChild>
                    <label htmlFor="profile-image" className="cursor-pointer">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Image
                      <input
                        id="profile-image"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageSelect}
                      />
                    </label>
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="schedule" className="mt-4">
            <div className="mb-4">
              <h3 className="font-semibold mb-2">Working Hours for This Branch</h3>
              <p className="text-sm text-muted-foreground">Set the schedule for when this staff member works at this branch</p>
            </div>

            {staff?.id && (
              <div className="mb-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    const conflicts = await checkScheduleConflicts(staff.id);
                    setScheduleConflicts(conflicts);
                    if (conflicts.length === 0) {
                      toast({
                        title: "No Conflicts",
                        description: "This schedule doesn't conflict with other branches",
                      });
                    }
                  }}
                  disabled={checkingConflicts}
                >
                  {checkingConflicts ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    "Check for Schedule Conflicts"
                  )}
                </Button>
              </div>
            )}

            {scheduleConflicts.length > 0 && (
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Schedule Conflicts Detected</AlertTitle>
                <AlertDescription>
                  <div className="mt-2 space-y-2">
                    {Object.entries(groupConflictsByDay(scheduleConflicts)).map(([day, dayConflicts]) => (
                      <div key={day}>
                        <p className="font-semibold capitalize">{day}:</p>
                        <ul className="list-disc list-inside ml-2 text-sm">
                          {dayConflicts.map((conflict, idx) => (
                            <li key={idx}>
                              <span className="font-medium">{conflict.branch_name}</span> - 
                              {conflict.conflicting_slots.map((slot, slotIdx) => (
                                <span key={slotIdx}>
                                  {" "}{slot.new.start}-{slot.new.end} overlaps with {slot.existing.start}-{slot.existing.end}
                                </span>
                              ))}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <StaffScheduleBuilder value={workingHours} onChange={setWorkingHours} />
          </TabsContent>

          <TabsContent value="services" className="mt-4">
            <div className="mb-4">
              <h3 className="font-semibold mb-2">Services Provided</h3>
              <p className="text-sm text-muted-foreground">Select which services this staff member can provide at this branch</p>
            </div>

            {services.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">No services available for this branch</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {services.map((service) => (
                  <Card key={service.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={service.id}
                          checked={selectedServices.includes(service.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedServices([...selectedServices, service.id]);
                            } else {
                              setSelectedServices(selectedServices.filter((id) => id !== service.id));
                            }
                          }}
                        />
                        <label
                          htmlFor={service.id}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {service.title}
                        </label>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="overrides" className="mt-4">
            {staff?.id ? (
              <div className="space-y-6">
                <div className="mb-4">
                  <h3 className="font-semibold mb-2">Date-Specific Schedule Overrides</h3>
                  <p className="text-sm text-muted-foreground">
                    Set custom hours or mark unavailable for specific dates
                  </p>
                </div>
                
                <DateScheduleOverride
                  staffId={staff.id}
                  branchId={branchId}
                  onOverrideAdded={() => {
                    // Refresh could be added here if needed
                  }}
                />

                <ScheduleOverrideList
                  staffId={staff.id}
                  branchId={branchId}
                  onOverrideDeleted={() => {
                    // Refresh could be added here if needed
                  }}
                />
              </div>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">
                    Save staff member first to manage date overrides
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="leave" className="mt-4">
            {staff?.id ? (
              <div>
                <div className="mb-4">
                  <h3 className="font-semibold mb-2">Leave Management</h3>
                  <p className="text-sm text-muted-foreground">
                    Manage time-off requests and unavailability
                  </p>
                </div>

                <LeaveRequestManager
                  staffId={staff.id}
                  onLeaveChanged={() => {
                    // Refresh could be added here if needed
                  }}
                />
              </div>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">
                    Save staff member first to manage leave requests
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {staff ? "Updating..." : "Enrolling..."}
              </>
            ) : (
              <>{staff ? "Update Staff" : "Enroll Staff"}</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    <AlertDialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Schedule Conflicts Detected
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>
              <p className="mb-3">
                This staff member's schedule overlaps with their existing schedule at other branches:
              </p>
              <Card className="mb-4">
                <CardHeader>
                  <CardTitle className="text-sm">Conflicts:</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  {Object.entries(groupConflictsByDay(scheduleConflicts)).map(([day, dayConflicts]) => (
                    <div key={day} className="border-l-2 border-destructive pl-3">
                      <p className="font-semibold capitalize">{day}:</p>
                      <ul className="list-disc list-inside ml-2 text-muted-foreground">
                        {dayConflicts.map((conflict, idx) => (
                          <li key={idx}>
                            <span className="font-medium">{conflict.branch_name}</span>
                            {conflict.conflicting_slots.map((slot, slotIdx) => (
                              <div key={slotIdx} className="ml-4 text-xs">
                                {slot.new.start}-{slot.new.end} ↔ {slot.existing.start}-{slot.existing.end}
                              </div>
                            ))}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <p className="text-sm">
                Do you want to proceed anyway? The staff member will be scheduled at both locations during the overlapping times.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Go Back and Adjust</AlertDialogCancel>
          <AlertDialogAction
            onClick={async () => {
              setShowConflictDialog(false);
              await performSave();
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Proceed Anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  );
}
