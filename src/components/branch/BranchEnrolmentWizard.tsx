import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { BasicDetailsStep } from "./steps/BasicDetailsStep";
import { MediaUploadStep } from "./steps/MediaUploadStep";
import { ReviewStep } from "./steps/ReviewStep";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface BranchData {
  name: string;
  address: string;
  timezone: string;
  phone: string;
  email: string;
  open_hours: Record<string, { open: string; close: string }>;
  appointment_padding: number;
  logo_file?: File;
  hero_file?: File;
  gallery_files: File[];
  compliance_files: File[];
}

interface BranchEnrolmentWizardProps {
  onClose: () => void;
}

export const BranchEnrolmentWizard = ({ onClose }: BranchEnrolmentWizardProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [branchData, setBranchData] = useState<BranchData>({
    name: "",
    address: "",
    timezone: "UTC",
    phone: "",
    email: "",
    open_hours: {},
    appointment_padding: 15,
    gallery_files: [],
    compliance_files: [],
  });

  const totalSteps = 3;
  const progress = (currentStep / totalSteps) * 100;

  const updateBranchData = (data: Partial<BranchData>) => {
    setBranchData((prev) => ({ ...prev, ...data }));
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!branchData.name || !branchData.address || !branchData.phone || !branchData.email) {
        toast.error("Please fill in all required fields");
        return;
      }
    }
    if (currentStep === 2) {
      if (!branchData.logo_file || !branchData.hero_file) {
        toast.error("Logo and hero image are required");
        return;
      }
    }
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const uploadFile = async (file: File, bucket: string, path: string): Promise<string> => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to create a branch");
        return;
      }

      // Upload logo
      let logoUrl = "";
      if (branchData.logo_file) {
        const logoPath = `${user.id}/${Date.now()}-${branchData.logo_file.name}`;
        logoUrl = await uploadFile(branchData.logo_file, "branch-logos", logoPath);
      }

      // Upload hero image
      let heroUrl = "";
      if (branchData.hero_file) {
        const heroPath = `${user.id}/${Date.now()}-${branchData.hero_file.name}`;
        heroUrl = await uploadFile(branchData.hero_file, "branch-heroes", heroPath);
      }

      // Upload gallery images
      const galleryUrls = [];
      for (const file of branchData.gallery_files) {
        const galleryPath = `${user.id}/${Date.now()}-${file.name}`;
        const url = await uploadFile(file, "branch-gallery", galleryPath);
        galleryUrls.push(url);
      }

      // Upload compliance documents
      const complianceUrls = [];
      for (const file of branchData.compliance_files) {
        const compliancePath = `${user.id}/${Date.now()}-${file.name}`;
        const url = await uploadFile(file, "branch-compliance", compliancePath);
        complianceUrls.push(url);
      }

      // Create branch record
      const { error: insertError } = await supabase
        .from("branches")
        .insert({
          name: branchData.name,
          address: branchData.address,
          timezone: branchData.timezone,
          phone: branchData.phone,
          email: branchData.email,
          open_hours: branchData.open_hours,
          appointment_padding: branchData.appointment_padding,
          logo_url: logoUrl,
          hero_image_url: heroUrl,
          gallery: galleryUrls,
          compliance_docs: complianceUrls,
          created_by: user.id,
        });

      if (insertError) throw insertError;

      toast.success("Branch enrolled successfully!");
      onClose();
    } catch (error: any) {
      console.error("Error creating branch:", error);
      toast.error(error.message || "Failed to create branch");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-background p-4">
      <div className="container mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between">
          <Button variant="outline" onClick={onClose} className="gap-2">
            <X className="w-4 h-4" />
            Cancel
          </Button>
          <div className="text-center flex-1 mx-4">
            <h2 className="text-2xl font-bold">Branch Enrolment</h2>
            <p className="text-muted-foreground">Step {currentStep} of {totalSteps}</p>
          </div>
          <div className="w-24"></div>
        </div>

        <Progress value={progress} className="mb-8" />

        <Card className="p-8 shadow-lg">
          {currentStep === 1 && (
            <BasicDetailsStep data={branchData} updateData={updateBranchData} />
          )}
          {currentStep === 2 && (
            <MediaUploadStep data={branchData} updateData={updateBranchData} />
          )}
          {currentStep === 3 && <ReviewStep data={branchData} />}

          <div className="flex justify-between mt-8 pt-6 border-t">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>

            {currentStep < totalSteps ? (
              <Button onClick={handleNext} className="gap-2">
                Next
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={isSubmitting} className="gap-2">
                <Check className="w-4 h-4" />
                {isSubmitting ? "Submitting..." : "Submit"}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
