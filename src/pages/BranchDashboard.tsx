import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, Package, Plus, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Branch {
  id: string;
  name: string;
  address: string;
  status: string;
  logo_url: string | null;
  _count?: {
    services: number;
    staff: number;
  };
}

export default function BranchDashboard() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/");
        return;
      }

      const { data: branchesData, error } = await supabase
        .from("branches")
        .select("*")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch counts for each branch
      const branchesWithCounts = await Promise.all(
        (branchesData || []).map(async (branch) => {
          const { count: servicesCount } = await supabase
            .from("services")
            .select("*", { count: "exact", head: true })
            .eq("branch_id", branch.id);

          const { count: staffCount } = await supabase
            .from("staff_branches")
            .select("*", { count: "exact", head: true })
            .eq("branch_id", branch.id);

          return {
            ...branch,
            _count: {
              services: servicesCount || 0,
              staff: staffCount || 0,
            },
          };
        })
      );

      setBranches(branchesWithCounts);
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-success text-success-foreground";
      case "pending":
        return "bg-warning text-warning-foreground";
      case "draft":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading branches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Branch Dashboard</h1>
            <p className="text-muted-foreground">Manage your branches, staff, and services</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate("/")}>
              <Plus className="mr-2 h-4 w-4" />
              New Branch
            </Button>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>

        {branches.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No branches yet</h3>
                <p className="text-muted-foreground mb-4">
                  Get started by creating your first branch
                </p>
                <Button onClick={() => navigate("/")}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Branch
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {branches.map((branch) => (
              <Card
                key={branch.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/branch/${branch.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    {branch.logo_url ? (
                      <img
                        src={branch.logo_url}
                        alt={branch.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <Badge className={getStatusColor(branch.status)}>
                      {branch.status}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl">{branch.name}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {branch.address}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Package className="h-4 w-4" />
                      <span>{branch._count?.services || 0} Services</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{branch._count?.staff || 0} Staff</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
