import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Package, DollarSign, Clock, Trash2, Edit, TrendingUp, Calendar, Star, Users, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ImageCropper } from "@/components/branch/ImageCropper";
import { compressGalleryImage } from "@/lib/imageCompression";
import { ServiceImageGallery } from "@/components/services/ServiceImageGallery";

interface Branch {
  id: string;
  name: string;
}

interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
  profile_image_url?: string;
}

interface Review {
  id: string;
  customer_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

interface Service {
  id: string;
  title: string;
  service_type?: string;
  duration: number;
  cost: number;
  image_url?: string;
  gallery?: string[];
  branch_id: string;
  branches?: {
    name: string;
  };
  staff?: StaffMember[];
  reviews?: Review[];
  averageRating?: number;
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
    service_type: "",
    duration: "",
    cost: "",
    branch_id: "",
  });

  const [serviceImage, setServiceImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [cropImage, setCropImage] = useState<string | null>(null);
  
  // Gallery state (up to 5 additional images)
  const [galleryImages, setGalleryImages] = useState<File[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const [cropGalleryImage, setCropGalleryImage] = useState<{ imageUrl: string; index: number } | null>(null);
  const [existingGalleryUrls, setExistingGalleryUrls] = useState<string[]>([]);

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

      // Fetch staff assigned to each service
      const { data: staffServicesData, error: staffServicesError } = await supabase
        .from("staff_services")
        .select(`
          service_id,
          staff:staff_id (
            id,
            first_name,
            last_name,
            profile_image_url
          )
        `)
        .in("service_id", servicesData?.map(s => s.id) || []);

      if (staffServicesError) throw staffServicesError;

      // Fetch reviews for each service
      const { data: reviewsData, error: reviewsError } = await supabase
        .from("service_reviews")
        .select("*")
        .in("service_id", servicesData?.map(s => s.id) || [])
        .order("created_at", { ascending: false });

      if (reviewsError) throw reviewsError;

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

        // Get staff for this service
        const serviceStaff = staffServicesData
          ?.filter(ss => ss.service_id === service.id)
          .map(ss => ss.staff)
          .filter(Boolean) as StaffMember[] || [];

        // Get reviews for this service
        const serviceReviews = reviewsData?.filter(r => r.service_id === service.id) || [];
        const averageRating = serviceReviews.length > 0
          ? serviceReviews.reduce((sum, r) => sum + r.rating, 0) / serviceReviews.length
          : 0;

        return {
          ...service,
          gallery: Array.isArray(service.gallery) ? service.gallery as string[] : [],
          staff: serviceStaff,
          reviews: serviceReviews,
          averageRating,
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
      let imageUrl = editingService?.image_url || null;

      // Upload main image if a new one was selected
      if (serviceImage) {
        const fileName = `${Date.now()}-${serviceImage.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("service-images")
          .upload(fileName, serviceImage);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("service-images")
          .getPublicUrl(fileName);

        imageUrl = publicUrl;
      }

      // Upload gallery images
      let galleryUrls = [...existingGalleryUrls]; // Keep existing URLs
      if (galleryImages.length > 0) {
        const uploadPromises = galleryImages.map(async (file, index) => {
          const fileName = `gallery-${Date.now()}-${index}-${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from("service-images")
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from("service-images")
            .getPublicUrl(fileName);

          return publicUrl;
        });

        const uploadedUrls = await Promise.all(uploadPromises);
        galleryUrls = [...galleryUrls, ...uploadedUrls];
      }

      const serviceData = {
        title: formData.title,
        service_type: formData.service_type || null,
        duration: parseInt(formData.duration),
        cost: parseFloat(formData.cost),
        branch_id: formData.branch_id,
        image_url: imageUrl,
        gallery: galleryUrls,
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
      service_type: service.service_type || "",
      duration: service.duration.toString(),
      cost: service.cost.toString(),
      branch_id: service.branch_id,
    });
    setImagePreview(service.image_url || null);
    
    // Load existing gallery images
    const gallery = service.gallery as any;
    if (gallery && Array.isArray(gallery)) {
      setExistingGalleryUrls(gallery);
    }
    
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
      service_type: "",
      duration: "",
      cost: "",
      branch_id: "",
    });
    setEditingService(null);
    setServiceImage(null);
    setImagePreview(null);
    setGalleryImages([]);
    setGalleryPreviews([]);
    setExistingGalleryUrls([]);
  };

  const handleImageSelect = async (file: File) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Service images must be JPG, PNG, or WEBP");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Service images must be less than 4MB");
      return;
    }

    const imageUrl = URL.createObjectURL(file);
    setCropImage(imageUrl);
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    try {
      const croppedFile = new File([croppedBlob], `service-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });

      const compressionResult = await compressGalleryImage(croppedFile);
      const preview = URL.createObjectURL(compressionResult.file);

      setServiceImage(compressionResult.file);
      setImagePreview(preview);

      toast.success("Service image added");
    } catch (error) {
      console.error("Error processing image:", error);
      toast.error("Failed to process image");
    } finally {
      setCropImage(null);
    }
  };

  const handleGalleryImageSelect = async (file: File) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Gallery images must be JPG, PNG, or WEBP");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Gallery images must be less than 4MB");
      return;
    }

    const totalImages = existingGalleryUrls.length + galleryImages.length;
    if (totalImages >= 5) {
      toast.error("Maximum 5 gallery images allowed");
      return;
    }

    const imageUrl = URL.createObjectURL(file);
    setCropGalleryImage({ imageUrl, index: galleryImages.length });
  };

  const handleGalleryCropComplete = async (croppedBlob: Blob) => {
    try {
      const croppedFile = new File([croppedBlob], `gallery-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });

      const compressionResult = await compressGalleryImage(croppedFile);
      const preview = URL.createObjectURL(compressionResult.file);

      setGalleryImages([...galleryImages, compressionResult.file]);
      setGalleryPreviews([...galleryPreviews, preview]);

      toast.success("Gallery image added");
    } catch (error) {
      console.error("Error processing gallery image:", error);
      toast.error("Failed to process gallery image");
    } finally {
      setCropGalleryImage(null);
    }
  };

  const removeGalleryPreview = (index: number) => {
    setGalleryImages(galleryImages.filter((_, i) => i !== index));
    setGalleryPreviews(galleryPreviews.filter((_, i) => i !== index));
  };

  const removeExistingGalleryImage = (index: number) => {
    setExistingGalleryUrls(existingGalleryUrls.filter((_, i) => i !== index));
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
    <div className="min-h-screen bg-background">
      {/* Gradient Header */}
      <div className="bg-gradient-to-r from-primary via-primary/90 to-accent py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="text-white">
              <h1 className="text-3xl sm:text-4xl font-bold mb-2">Services</h1>
              <p className="text-white/90">Manage services across all branches</p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
              <DialogTrigger asChild>
                <Button className="bg-white text-primary hover:bg-white/90">
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
                    <Label htmlFor="service_type">Service Type</Label>
                    <Select
                      value={formData.service_type}
                      onValueChange={(value) => setFormData({ ...formData, service_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="haircut">Haircut</SelectItem>
                        <SelectItem value="styling">Styling</SelectItem>
                        <SelectItem value="coloring">Coloring</SelectItem>
                        <SelectItem value="treatment">Treatment</SelectItem>
                        <SelectItem value="massage">Massage</SelectItem>
                        <SelectItem value="spa">Spa</SelectItem>
                        <SelectItem value="consultation">Consultation</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
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

                  <div>
                    <Label>Main Service Image (Optional)</Label>
                    <div className="mt-2">
                      {imagePreview ? (
                        <div className="relative w-full h-48 rounded-lg overflow-hidden border-2 border-border">
                          <img
                            src={imagePreview}
                            alt="Service preview"
                            className="w-full h-full object-cover"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2"
                            onClick={() => {
                              setServiceImage(null);
                              setImagePreview(null);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="w-10 h-10 mb-3 text-muted-foreground" />
                            <p className="mb-2 text-sm text-muted-foreground">
                              <span className="font-semibold">Click to upload</span> main image
                            </p>
                            <p className="text-xs text-muted-foreground">
                              JPG, PNG or WEBP (MAX. 4MB)
                            </p>
                          </div>
                          <input
                            type="file"
                            className="hidden"
                            accept="image/jpeg,image/png,image/jpg,image/webp"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleImageSelect(file);
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label>Image Gallery (Optional, max 5)</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Add additional images for customers to browse
                    </p>
                    
                    {/* Existing gallery images */}
                    {existingGalleryUrls.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mb-2">
                        {existingGalleryUrls.map((url, index) => (
                          <div key={`existing-${index}`} className="relative w-full h-24 rounded-lg overflow-hidden border-2 border-border">
                            <img
                              src={url}
                              alt={`Gallery ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute top-1 right-1 h-6 w-6"
                              onClick={() => removeExistingGalleryImage(index)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* New gallery image previews */}
                    {galleryPreviews.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mb-2">
                        {galleryPreviews.map((preview, index) => (
                          <div key={`preview-${index}`} className="relative w-full h-24 rounded-lg overflow-hidden border-2 border-primary">
                            <img
                              src={preview}
                              alt={`New gallery ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute top-1 right-1 h-6 w-6"
                              onClick={() => removeGalleryPreview(index)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Upload button */}
                    {(existingGalleryUrls.length + galleryImages.length) < 5 && (
                      <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex flex-col items-center justify-center">
                          <Upload className="w-6 h-6 mb-1 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">
                            Add gallery image
                          </p>
                        </div>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/jpeg,image/png,image/jpg,image/webp"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleGalleryImageSelect(file);
                          }}
                        />
                      </label>
                    )}
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
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
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
          {services.map((service) => {
            const allImages = [
              ...(service.image_url ? [service.image_url] : []),
              ...(service.gallery || [])
            ];
            
            return (
            <Card key={service.id} className="hover:shadow-xl transition-all hover:scale-[1.02] border-2 hover:border-primary/20 overflow-hidden">
              {allImages.length > 0 && (
                <ServiceImageGallery 
                  images={allImages}
                  serviceName={service.title}
                />
              )}
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-xl">{service.title}</CardTitle>
                      {service.service_type && (
                        <Badge variant="outline" className="capitalize">
                          {service.service_type}
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="mt-1 flex items-center gap-2">
                      {service.branches?.name}
                      {service.averageRating > 0 && (
                        <span className="flex items-center gap-1 text-yellow-600">
                          <Star className="h-3 w-3 fill-yellow-600" />
                          {service.averageRating.toFixed(1)} ({service.reviews?.length || 0})
                        </span>
                      )}
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

                  {service.staff && service.staff.length > 0 && (
                    <>
                      <Separator className="my-3" />
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span>Qualified Staff ({service.staff.length})</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {service.staff.slice(0, 3).map((staff) => (
                            <div key={staff.id} className="flex items-center gap-2 bg-muted px-2 py-1 rounded-md">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={staff.profile_image_url} />
                                <AvatarFallback className="text-xs">
                                  {staff.first_name[0]}{staff.last_name[0]}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs">
                                {staff.first_name} {staff.last_name}
                              </span>
                            </div>
                          ))}
                          {service.staff.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{service.staff.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                  
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

                  {service.reviews && service.reviews.length > 0 && (
                    <>
                      <Separator className="my-3" />
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Star className="h-4 w-4" />
                            <span>Recent Reviews</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-600 text-yellow-600" />
                            <span className="font-semibold">{service.averageRating?.toFixed(1)}</span>
                          </div>
                        </div>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {service.reviews.slice(0, 2).map((review) => (
                            <div key={review.id} className="bg-muted p-2 rounded text-xs">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-semibold">{review.customer_name}</span>
                                <div className="flex items-center gap-1">
                                  {Array.from({ length: review.rating }).map((_, i) => (
                                    <Star key={i} className="h-3 w-3 fill-yellow-600 text-yellow-600" />
                                  ))}
                                </div>
                              </div>
                              {review.comment && (
                                <p className="text-muted-foreground line-clamp-2">{review.comment}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
          })}
        </div>
      )}
      </div>

      {cropImage && (
        <ImageCropper
          image={cropImage}
          aspectRatio={4 / 3}
          onCropComplete={handleCropComplete}
          onCancel={() => setCropImage(null)}
          title="Crop Service Image"
        />
      )}

      {cropGalleryImage && (
        <ImageCropper
          image={cropGalleryImage.imageUrl}
          aspectRatio={4 / 3}
          onCropComplete={handleGalleryCropComplete}
          onCancel={() => setCropGalleryImage(null)}
          title="Crop Gallery Image"
        />
      )}
    </div>
  );
}
