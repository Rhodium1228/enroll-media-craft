import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import StaffCard from "./StaffCard";
import StaffEnrollmentDialog from "./StaffEnrollmentDialog";

interface Staff {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  profile_image_url: string | null;
  status: string;
}

interface StaffListProps {
  branchId: string;
}

export default function StaffList({ branchId }: StaffListProps) {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchStaff();
  }, [branchId]);

  const fetchStaff = async () => {
    try {
      const { data, error } = await supabase
        .from("staff_branches")
        .select(`
          staff:staff_id (
            id,
            first_name,
            last_name,
            email,
            phone,
            profile_image_url,
            status
          )
        `)
        .eq("branch_id", branchId);

      if (error) throw error;

      const staffList = data?.map((item: any) => item.staff).filter(Boolean) || [];
      setStaff(staffList);
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

  const handleEdit = (staffMember: Staff) => {
    setSelectedStaff(staffMember);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedStaff(null);
    fetchStaff();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Staff Members</h2>
          <p className="text-muted-foreground">Manage staff assigned to this branch</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Staff
        </Button>
      </div>

      {staff.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No staff members enrolled yet</p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add First Staff Member
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {staff.map((staffMember) => (
            <StaffCard
              key={staffMember.id}
              staff={staffMember}
              branchId={branchId}
              onEdit={handleEdit}
              onUpdate={fetchStaff}
            />
          ))}
        </div>
      )}

      <StaffEnrollmentDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        branchId={branchId}
        staff={selectedStaff}
      />
    </div>
  );
}
