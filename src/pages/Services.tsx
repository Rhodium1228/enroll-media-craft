import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Package, DollarSign, Clock, Trash2, Edit, TrendingUp, Calendar, Star } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Branch {
  id: string;
  name: string;
}

interface Service {
  id: string;
  title: string;
  duration: number;
  cost: number;
  image_url?: string;
  branch_id: string;
  branches?: {
    name: string;
  };
  metrics?: {
    bookingCount: number;
    revenueGenerated: number;
    peakDay?: string;
    peakTimeSlot?: string;
  };
}

export default function Services() {
  const [services, setServices] = useState<Service[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: "",
    duration: "",
    cost: "",
    branch_id: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/");
        return;
      }

      // Fetch branches
      const { data: branchesData, error: branchesError } = await supabase
        .from("branches")
        .select("id, name")
        .eq("created_by", user.id);

      if (branchesError) throw branchesError;
      setBranches(branchesData || []);

      // Fetch services with branch names
      const { data: servicesData, error: servicesError } = await supabase
        .from("services")
        .select(`
          *,
          branches(name)
        `)
        .in("branch_id", branchesData?.map(b => b.id) || [])
        .order("created_at", { ascending: false });

      if (servicesError) throw servicesError;

      // Fetch appointments to calculate metrics
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from("appointments")
        .select("service_id, date, start_time, status")
        .in("service_id", servicesData?.map(s => s.id) || []);

      if (appointmentsError) throw appointmentsError;

      // Calculate metrics for each service
      const servicesWithMetrics = servicesData?.map(service => {
        const serviceAppointments = appointmentsData?.filter(apt => apt.service_id === service.id) || [];
        
        // Calculate booking count (completed + scheduled)
        const bookingCount = serviceAppointments.filter(
          apt => apt.status === 'completed' || apt.status === 'scheduled'
        ).length;

        // Calculate revenue (cost * completed appointments)
        const completedCount = serviceAppointments.filter(apt => apt.status === 'completed').length;
        const revenueGenerated = completedCount * service.cost;

        // Calculate peak day of week
        const dayCount: Record<string, number> = {};
        serviceAppointments.forEach(apt => {
          const dayOfWeek = new Date(apt.date).toLocaleDateString('en-US', { weekday: 'short' });
          dayCount[dayOfWeek] = (dayCount[dayOfWeek] || 0) + 1;
        });
        const peakDay = Object.keys(dayCount).length > 0
          ? Object.entries(dayCount).sort(([, a], [, b]) => b - a)[0][0]
          : undefined;

        // Calculate peak time slot
        const timeSlotCount: Record<string, number> = { Morning: 0, Afternoon: 0, Evening: 0 };
        serviceAppointments.forEach(apt => {
          const hour = parseInt(apt.start_time.split(':')[0]);
          if (hour < 12) timeSlotCount.Morning++;
          else if (hour < 17) timeSlotCount.Afternoon++;
          else timeSlotCount.Evening++;
        });
        const peakTimeSlot = Object.keys(timeSlotCount).length > 0
          ? Object.entries(timeSlotCount).sort(([, a], [, b]) => b - a)[0][0]
          : undefined;

        return {
          ...service,
          metrics: {
            bookingCount,
            revenueGenerated,
            peakDay,
            peakTimeSlot
          }
        };
      }) || [];

      setServices(servicesWithMetrics);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load services");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.duration || !formData.cost || !formData.branch_id) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      const serviceData = {
        title: formData.title,
        duration: parseInt(formData.duration),
        cost: parseFloat(formData.cost),
        branch_id: formData.branch_id,
      };

      if (editingService) {
        const { error } = await supabase
          .from("services")
          .update(serviceData)
          .eq("id", editingService.id);

        if (error) throw error;
        toast.success("Service updated successfully");
      } else {
        const { error } = await supabase
          .from("services")
          .insert(serviceData);

        if (error) throw error;
        toast.success("Service created successfully");
      }

      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error saving service:", error);
      toast.error("Failed to save service");
    }
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setFormData({
      title: service.title,
      duration: service.duration.toString(),
      cost: service.cost.toString(),
      branch_id: service.branch_id,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (serviceId: string) => {
    if (!confirm("Are you sure you want to delete this service?")) return;

    try {
      const { error } = await supabase
        .from("services")
        .delete()
        .eq("id", serviceId);

      if (error) throw error;
      toast.success("Service deleted successfully");
      fetchData();
    } catch (error) {
      console.error("Error deleting service:", error);
      toast.error("Failed to delete service");
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      duration: "",
      cost: "",
      branch_id: "",
    });
    setEditingService(null);
  };

  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      resetForm();
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Services</h1>
          <p className="text-muted-foreground">Manage services across all branches</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Service
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingService ? "Edit Service" : "Create New Service"}</DialogTitle>
              <DialogDescription>
                {editingService ? "Update service details" : "Add a new service to your branch"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="branch">Branch</Label>
                <Select
                  value={formData.branch_id}
                  onValueChange={(value) => setFormData({ ...formData, branch_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="title">Service Name</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Haircut, Massage, Consultation"
                />
              </div>

              <div>
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  placeholder="30"
                  min="1"
                />
              </div>

              <div>
                <Label htmlFor="cost">Cost ($)</Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                  placeholder="50.00"
                  min="0"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => handleDialogChange(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingService ? "Update" : "Create"} Service
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {services.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No services yet</h3>
              <p className="text-muted-foreground mb-4">
                Get started by creating your first service
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Service
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <Card key={service.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl">{service.title}</CardTitle>
                    <CardDescription className="mt-1">
                      {service.branches?.name}
                    </CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(service)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(service.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{service.duration} minutes</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <Badge variant="secondary" className="text-base font-semibold">
                      ${service.cost.toFixed(2)}
                    </Badge>
                  </div>
                  
                  {service.metrics && (
                    <>
                      <div className="border-t pt-3 mt-3 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <TrendingUp className="h-4 w-4" />
                            <span>Total Bookings</span>
                          </div>
                          <Badge variant="outline" className="font-semibold">
                            {service.metrics.bookingCount}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <DollarSign className="h-4 w-4" />
                            <span>Revenue</span>
                          </div>
                          <Badge variant="outline" className="font-semibold text-green-600">
                            ${service.metrics.revenueGenerated.toFixed(2)}
                          </Badge>
                        </div>

                        {service.metrics.peakDay && (
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              <span>Peak Day</span>
                            </div>
                            <Badge variant="outline">
                              {service.metrics.peakDay}
                            </Badge>
                          </div>
                        )}

                        {service.metrics.peakTimeSlot && (
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span>Peak Time</span>
                            </div>
                            <Badge variant="outline">
                              {service.metrics.peakTimeSlot}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
