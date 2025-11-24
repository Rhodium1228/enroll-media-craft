import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { ImageCropper } from "../ImageCropper";
import { compressGalleryImage } from "@/lib/imageCompression";
import { Badge } from "@/components/ui/badge";

export interface Service {
  id: string;
  title: string;
  service_type: string;
  duration: number; // in minutes
  cost: number;
  image: File | null;
  imagePreview: string | null;
}

interface ServicesStepProps {
  services: Service[];
  onChange: (services: Service[]) => void;
}

export default function ServicesStep({ services, onChange }: ServicesStepProps) {
  const [cropImage, setCropImage] = useState<{ imageUrl: string; serviceId: string } | null>(null);

  const addService = () => {
    const newService: Service = {
      id: crypto.randomUUID(),
      title: "",
      service_type: "",
      duration: 30,
      cost: 0,
      image: null,
      imagePreview: null,
    };
    onChange([...services, newService]);
  };

  const removeService = (id: string) => {
    onChange(services.filter((s) => s.id !== id));
  };

  const updateService = (id: string, field: keyof Service, value: any) => {
    onChange(
      services.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const handleImageSelect = async (serviceId: string, file: File) => {
    // Validate file
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
    setCropImage({ imageUrl, serviceId });
  };

  const handleCropComplete = async (croppedBlob: Blob, serviceId: string) => {
    try {
      const croppedFile = new File([croppedBlob], `service-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });

      // Compress the image
      const compressionResult = await compressGalleryImage(croppedFile);
      const preview = URL.createObjectURL(compressionResult.file);

      updateService(serviceId, "image", compressionResult.file);
      updateService(serviceId, "imagePreview", preview);

      toast.success("Service image added and compressed");
    } catch (error) {
      console.error("Error processing image:", error);
      toast.error("Failed to process image");
    } finally {
      setCropImage(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Services</h3>
        <p className="text-sm text-muted-foreground">
          Add services that this branch will offer
        </p>
      </div>

      {services.length === 0 && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>No services added yet</CardTitle>
            <CardDescription>
              Add at least one service for this branch
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="space-y-4">
        {services.map((service, index) => (
          <Card key={service.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Service {index + 1}</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeService(service.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor={`title-${service.id}`}>Service Title *</Label>
                  <Input
                    id={`title-${service.id}`}
                    value={service.title}
                    onChange={(e) => updateService(service.id, "title", e.target.value)}
                    placeholder="e.g., Haircut, Massage, Consultation"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor={`service_type-${service.id}`}>Service Type</Label>
                  <Select
                    value={service.service_type}
                    onValueChange={(value) => updateService(service.id, "service_type", value)}
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
                  <Label htmlFor={`duration-${service.id}`}>Duration (minutes) *</Label>
                  <Input
                    id={`duration-${service.id}`}
                    type="number"
                    min="1"
                    value={service.duration}
                    onChange={(e) =>
                      updateService(service.id, "duration", parseInt(e.target.value) || 0)
                    }
                    placeholder="30"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor={`cost-${service.id}`}>Cost ($) *</Label>
                  <Input
                    id={`cost-${service.id}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={service.cost}
                    onChange={(e) =>
                      updateService(service.id, "cost", parseFloat(e.target.value) || 0)
                    }
                    placeholder="50.00"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <Label>Service Image</Label>
                  {service.imagePreview ? (
                    <div className="relative mt-2">
                      <img
                        src={service.imagePreview}
                        alt="Service preview"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={() => {
                          updateService(service.id, "image", null);
                          updateService(service.id, "imagePreview", null);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <Badge variant="secondary" className="absolute bottom-2 left-2">
                        Auto-compressed
                      </Badge>
                    </div>
                  ) : (
                    <div className="mt-2">
                      <label
                        htmlFor={`image-${service.id}`}
                        className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent"
                      >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="h-8 w-8 mb-2 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            Click to upload service image
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            JPG, PNG or WEBP (max 4MB)
                          </p>
                        </div>
                        <input
                          id={`image-${service.id}`}
                          type="file"
                          className="hidden"
                          accept="image/jpeg,image/png,image/jpg,image/webp"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageSelect(service.id, file);
                          }}
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button onClick={addService} variant="outline" className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Add Service
      </Button>

      {cropImage && (
        <ImageCropper
          image={cropImage.imageUrl}
          aspectRatio={16 / 9}
          onCropComplete={(blob) => handleCropComplete(blob, cropImage.serviceId)}
          onCancel={() => setCropImage(null)}
          title="Crop Service Image"
        />
      )}
    </div>
  );
}
