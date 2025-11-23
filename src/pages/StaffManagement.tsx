import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, User, Mail, Phone, Building2, Edit2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Staff {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  profile_image_url: string | null;
  status: string;
}

interface Branch {
  id: string;
  name: string;
}

export default function StaffManagement() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [branches, setBranches] = useState<{ [staffId: string]: Branch[] }>({});
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    status: "active",
  });

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("staff")
        .select("*")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setStaff(data || []);

      // Fetch branches for each staff member
      if (data) {
        const branchesMap: { [staffId: string]: Branch[] } = {};
        for (const staffMember of data) {
          const { data: staffBranches } = await supabase
            .from("staff_branches")
            .select(`
              branch_id,
              branches:branch_id (
                id,
                name
              )
            `)
            .eq("staff_id", staffMember.id);

          branchesMap[staffMember.id] = (staffBranches || [])
            .map((sb: any) => sb.branches)
            .filter(Boolean);
        }
        setBranches(branchesMap);
      }
    } catch (error) {
      console.error("Error fetching staff:", error);
      toast.error("Failed to load staff");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (staffMember: Staff) => {
    setSelectedStaff(staffMember);
    setFormData({
      firstName: staffMember.first_name,
      lastName: staffMember.last_name,
      email: staffMember.email,
      phone: staffMember.phone,
      status: staffMember.status,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (selectedStaff) {
        // Update existing staff
        const { error } = await supabase
          .from("staff")
          .update({
            first_name: formData.firstName,
            last_name: formData.lastName,
            email: formData.email,
            phone: formData.phone,
            status: formData.status,
          })
          .eq("id", selectedStaff.id);

        if (error) throw error;
        toast.success("Staff member updated");
      } else {
        // Create new staff
        const { error } = await supabase
          .from("staff")
          .insert({
            first_name: formData.firstName,
            last_name: formData.lastName,
            email: formData.email,
            phone: formData.phone,
            status: formData.status,
            created_by: user.id,
          });

        if (error) throw error;
        toast.success("Staff member created");
      }

      setDialogOpen(false);
      setSelectedStaff(null);
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        status: "active",
      });
      fetchStaff();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-success text-success-foreground";
      case "inactive":
        return "bg-muted text-muted-foreground";
      case "on_leave":
        return "bg-warning text-warning-foreground";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading staff...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Staff Management</h1>
          <p className="text-muted-foreground mt-1">
            Onboard and manage staff across all branches
          </p>
        </div>
        <Button onClick={() => { setSelectedStaff(null); setDialogOpen(true); }}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Staff
        </Button>
      </div>

      {staff.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            No staff members enrolled yet
          </p>
          <Button onClick={() => { setSelectedStaff(null); setDialogOpen(true); }}>
            <UserPlus className="mr-2 h-4 w-4" />
            Enroll First Staff Member
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff.map((staffMember) => (
            <Card key={staffMember.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {staffMember.profile_image_url ? (
                      <img
                        src={staffMember.profile_image_url}
                        alt={`${staffMember.first_name} ${staffMember.last_name}`}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-lg">
                        {staffMember.first_name} {staffMember.last_name}
                      </h3>
                      <Badge className={getStatusColor(staffMember.status)} variant="secondary">
                        {staffMember.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{staffMember.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{staffMember.phone}</span>
                  </div>
                  
                  <div className="pt-2 border-t">
                    <div className="flex items-start gap-2 text-sm">
                      <Building2 className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground mb-1">Enrolled at:</p>
                        {branches[staffMember.id]?.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {branches[staffMember.id].map((branch) => (
                              <Badge
                                key={branch.id}
                                variant="outline"
                                className="text-xs cursor-pointer"
                                onClick={() => navigate(`/branch/${branch.id}`)}
                              >
                                {branch.name}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">No branches yet</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleEdit(staffMember)}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedStaff ? "Edit Staff Member" : "Add New Staff"}</DialogTitle>
            <DialogDescription>
              {selectedStaff ? "Update staff member details" : "Create a new staff member"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
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

            <Button onClick={handleSubmit} className="w-full">
              {selectedStaff ? "Update Staff" : "Create Staff"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
