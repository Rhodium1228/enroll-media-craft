import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Building2, Mail, Phone, MapPin, Clock, Calendar, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import StaffList from "@/components/staff/StaffList";
import { BranchDateOverride } from "@/components/branch/BranchDateOverride";
import { BranchOverrideList } from "@/components/branch/BranchOverrideList";
import { BranchHoursCalendar } from "@/components/branch/BranchHoursCalendar";

interface Branch {
  id: string;
  name: string;
  address: string;
  email: string;
  phone: string;
  status: string;
  timezone: string;
  logo_url: string | null;
  hero_image_url: string | null;
  open_hours: any;
}

interface Service {
  id: string;
  title: string;
  cost: number;
  duration: number;
  image_url: string | null;
}

export default function BranchDetail() {
  const { branchId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [branch, setBranch] = useState<Branch | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (branchId) {
      fetchBranchData();
    }
  }, [branchId]);

  const fetchBranchData = async () => {
    try {
      const { data: branchData, error: branchError } = await supabase
        .from("branches")
        .select("*")
        .eq("id", branchId)
        .single();

      if (branchError) throw branchError;
      setBranch(branchData);

      const { data: servicesData, error: servicesError } = await supabase
        .from("services")
        .select("*")
        .eq("branch_id", branchId)
        .order("title");

      if (servicesError) throw servicesError;
      setServices(servicesData || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  if (loading || !branch) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/calendar")}
          >
            <Calendar className="mr-2 h-4 w-4" />
            View Staff Calendar
          </Button>
        </div>

        <div className="mb-8">
          <div className="flex items-start gap-4 mb-4">
            {branch.logo_url ? (
              <img
                src={branch.logo_url}
                alt={branch.name}
                className="w-20 h-20 rounded-lg object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center">
                <Building2 className="h-10 w-10 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-bold text-foreground">{branch.name}</h1>
                <Badge>{branch.status}</Badge>
              </div>
              <div className="flex flex-wrap gap-4 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>{branch.address}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span>{branch.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span>{branch.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{branch.timezone}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="services">Services ({services.length})</TabsTrigger>
            <TabsTrigger value="staff">Staff</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-6">
                {branch.hero_image_url && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Hero Image</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <img
                        src={branch.hero_image_url}
                        alt="Branch hero"
                        className="w-full h-64 object-cover rounded-lg"
                      />
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle>Branch Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Status</label>
                      <p className="text-foreground">{branch.status}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Timezone</label>
                      <p className="text-foreground">{branch.timezone}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Regular Operating Hours</label>
                      <div className="mt-2 space-y-2">
                        {Object.entries(branch.open_hours || {}).map(([day, hours]: [string, any]) => (
                          <div key={day} className="flex justify-between text-sm">
                            <span className="font-medium capitalize">{day}</span>
                            <span className="text-muted-foreground">
                              {hours?.closed ? "Closed" : `${hours?.open || "N/A"} - ${hours?.close || "N/A"}`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Schedule Overrides</CardTitle>
                      <Button
                        size="sm"
                        onClick={() => setShowOverrideDialog(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Override
                      </Button>
                    </div>
                    <CardDescription>
                      Date-specific hours for holidays and special events
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <BranchOverrideList
                      branchId={branchId!}
                      onEdit={(override) => {
                        setShowOverrideDialog(true);
                      }}
                      refreshTrigger={refreshTrigger}
                    />
                  </CardContent>
                </Card>
              </div>

              <div>
                <BranchHoursCalendar
                  branchId={branchId!}
                  refreshTrigger={refreshTrigger}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="services" className="mt-6">
            {services.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">No services available for this branch</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.map((service) => (
                  <Card key={service.id}>
                    {service.image_url && (
                      <img
                        src={service.image_url}
                        alt={service.title}
                        className="w-full h-48 object-cover rounded-t-lg"
                      />
                    )}
                    <CardHeader>
                      <CardTitle>{service.title}</CardTitle>
                      <CardDescription>
                        ${service.cost} • {service.duration} minutes
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="staff" className="mt-6">
            <StaffList branchId={branchId!} />
          </TabsContent>
        </Tabs>

        <Dialog open={showOverrideDialog} onOpenChange={setShowOverrideDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Branch Schedule Override</DialogTitle>
              <DialogDescription>
                Set custom operating hours or mark the branch as closed for specific dates
              </DialogDescription>
            </DialogHeader>
            <BranchDateOverride
              branchId={branchId!}
              onSaved={() => {
                setShowOverrideDialog(false);
                setRefreshTrigger(prev => prev + 1);
              }}
              onCancel={() => setShowOverrideDialog(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
