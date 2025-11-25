import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Check, X, Save } from "lucide-react";
import { BasicDetailsStep } from "./steps/BasicDetailsStep";
import { MediaUploadStep } from "./steps/MediaUploadStep";
import ServicesStep from "./steps/ServicesStep";
import { ReviewStep } from "./steps/ReviewStep";
import { DraftDialog } from "./DraftDialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Service } from "./steps/ServicesStep";

interface BranchData {
  name: string;
  address: string;
  timezone: string;
  phone: string;
  email: string;
  open_hours: Record<string, { open: string; close: string }>;
  appointment_padding: number;
  latitude?: number;
  longitude?: number;
  geofence_radius: number;
  logo_file?: File;
  hero_file?: File;
  gallery_files: File[];
  compliance_files: File[];
  services: Service[];
}

interface BranchEnrolmentWizardProps {
  onClose: () => void;
}

export const BranchEnrolmentWizard = ({ onClose }: BranchEnrolmentWizardProps) => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [draftTimestamp, setDraftTimestamp] = useState<number>(0);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    logo: number;
    hero: number;
    gallery: number;
    compliance: number;
  }>({ logo: 0, hero: 0, gallery: 0, compliance: 0 });

  const [branchData, setBranchData] = useState<BranchData>({
    name: "",
    address: "",
    timezone: "UTC",
    phone: "",
    email: "",
    open_hours: {},
    appointment_padding: 15,
    geofence_radius: 100,
    gallery_files: [],
    compliance_files: [],
    services: [],
  });

  // Check for draft on mount
  useEffect(() => {
    const draft = localStorage.getItem("branch_draft");
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        setDraftTimestamp(parsed.timestamp);
        setShowDraftDialog(true);
      } catch (e) {
        console.error("Failed to parse draft:", e);
        localStorage.removeItem("branch_draft");
      }
    }
  }, []);

  // Auto-save to localStorage every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (branchData.name || branchData.address) {
        const draft = {
          data: {
            ...branchData,
            logo_file: undefined,
            hero_file: undefined,
            gallery_files: [],
            compliance_files: [],
          },
          currentStep,
          timestamp: Date.now(),
        };
        localStorage.setItem("branch_draft", JSON.stringify(draft));
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [branchData, currentStep]);

  // Warn before closing with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (branchData.name || branchData.address) {
        e.preventDefault();
        e.returnValue = "You have unsaved changes!";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [branchData]);

  const handleResumeDraft = () => {
    const draft = localStorage.getItem("branch_draft");
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        setBranchData((prev) => ({ ...prev, ...parsed.data }));
        setCurrentStep(parsed.currentStep);
        toast.success("Draft restored successfully");
      } catch (e) {
        toast.error("Failed to restore draft");
      }
    }
    setShowDraftDialog(false);
  };

  const handleDiscardDraft = () => {
    localStorage.removeItem("branch_draft");
    setShowDraftDialog(false);
  };

  const handleSaveAsDraft = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to save a draft");
        return;
      }

      const { error } = await supabase.from("branches").insert({
        name: branchData.name || "Untitled Draft",
        address: branchData.address || "",
        timezone: branchData.timezone,
        phone: branchData.phone || "",
        email: branchData.email || "",
        open_hours: branchData.open_hours,
        appointment_padding: branchData.appointment_padding,
        status: "draft",
        created_by: user.id,
      });

      if (error) throw error;

      localStorage.removeItem("branch_draft");
      toast.success("Draft saved to database");
      onClose();
    } catch (error: any) {
      console.error("Error saving draft:", error);
      toast.error(error.message || "Failed to save draft");
    }
  };

  const totalSteps = 4;
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
    if (currentStep === 3) {
      if (branchData.services.length === 0) {
        toast.error("Please add at least one service");
        return;
      }
      const invalidService = branchData.services.find(
        (s) => !s.title || s.duration <= 0 || s.cost <= 0
      );
      if (invalidService) {
        toast.error("Please fill in all service details");
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

  const uploadFile = async (
    file: File,
    bucket: string,
    path: string,
    progressKey: keyof typeof uploadProgress
  ): Promise<string> => {
    try {
      setUploadProgress((prev) => ({ ...prev, [progressKey]: 10 }));

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) throw error;

      setUploadProgress((prev) => ({ ...prev, [progressKey]: 100 }));

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      return urlData.publicUrl;
    } catch (error) {
      setUploadProgress((prev) => ({ ...prev, [progressKey]: 0 }));
      throw error;
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setUploadProgress({ logo: 0, hero: 0, gallery: 0, compliance: 0 });

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
        logoUrl = await uploadFile(branchData.logo_file, "branch-logos", logoPath, "logo");
      }

      // Upload hero image
      let heroUrl = "";
      if (branchData.hero_file) {
        const heroPath = `${user.id}/${Date.now()}-${branchData.hero_file.name}`;
        heroUrl = await uploadFile(branchData.hero_file, "branch-heroes", heroPath, "hero");
      }

      // Upload gallery images
      const galleryUrls = [];
      for (let i = 0; i < branchData.gallery_files.length; i++) {
        const file = branchData.gallery_files[i];
        const galleryPath = `${user.id}/${Date.now()}-${file.name}`;
        setUploadProgress((prev) => ({
          ...prev,
          gallery: Math.round(((i + 1) / branchData.gallery_files.length) * 100),
        }));
        const url = await uploadFile(file, "branch-gallery", galleryPath, "gallery");
        galleryUrls.push(url);
      }

      // Upload compliance documents
      const complianceUrls = [];
      for (let i = 0; i < branchData.compliance_files.length; i++) {
        const file = branchData.compliance_files[i];
        const compliancePath = `${user.id}/${Date.now()}-${file.name}`;
        setUploadProgress((prev) => ({
          ...prev,
          compliance: Math.round(((i + 1) / branchData.compliance_files.length) * 100),
        }));
        const url = await uploadFile(file, "branch-compliance", compliancePath, "compliance");
        complianceUrls.push(url);
      }

      // Upload service images
      const servicesWithUrls = await Promise.all(
        branchData.services.map(async (service) => {
          let imageUrl = null;
          if (service.image) {
            const servicePath = `${user.id}/${Date.now()}-${service.image.name}`;
            imageUrl = await uploadFile(service.image, "service-images", servicePath, "gallery");
          }
          return {
            title: service.title,
            duration: service.duration,
            cost: service.cost,
            image_url: imageUrl,
          };
        })
      );

      // Create branch record
      const { data: branch, error: insertError } = await supabase
        .from("branches")
        .insert({
          name: branchData.name,
          address: branchData.address,
          timezone: branchData.timezone,
          phone: branchData.phone,
          email: branchData.email,
          open_hours: branchData.open_hours,
          appointment_padding: branchData.appointment_padding,
          latitude: branchData.latitude,
          longitude: branchData.longitude,
          geofence_radius: branchData.geofence_radius,
          logo_url: logoUrl,
          hero_image_url: heroUrl,
          gallery: galleryUrls,
          compliance_docs: complianceUrls,
          status: 'active',
          created_by: user.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Insert services
      if (servicesWithUrls.length > 0 && branch) {
        const { error: servicesError } = await supabase.from("services").insert(
          servicesWithUrls.map((service) => ({
            ...service,
            branch_id: branch.id,
          }))
        );

        if (servicesError) throw servicesError;
      }

      localStorage.removeItem("branch_draft");
      toast.success("Branch enrolled successfully!");
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error creating branch:", error);
      toast.error(error.message || "Failed to create branch");
    } finally {
      setIsSubmitting(false);
      setUploadProgress({ logo: 0, hero: 0, gallery: 0, compliance: 0 });
    }
  };

  const handleClose = () => {
    if (branchData.name || branchData.address) {
      setShowExitDialog(true);
    } else {
      onClose();
    }
  };

  return (
    <>
      <DraftDialog
        open={showDraftDialog}
        draftTimestamp={draftTimestamp}
        onResume={handleResumeDraft}
        onDiscard={handleDiscardDraft}
      />

      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Would you like to save as a draft before leaving?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={onClose}>Discard</AlertDialogCancel>
            <AlertDialogAction onClick={handleSaveAsDraft}>Save Draft</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-background p-4">
        <div className="container mx-auto max-w-5xl">
          <div className="mb-8 flex items-center justify-between">
            <Button variant="outline" onClick={handleClose} className="gap-2">
              <X className="w-4 h-4" />
              Cancel
            </Button>
            <div className="text-center flex-1 mx-4">
              <h2 className="text-2xl font-bold">Branch Enrolment</h2>
              <p className="text-muted-foreground">Step {currentStep} of {totalSteps}</p>
            </div>
            <Button variant="outline" onClick={handleSaveAsDraft} className="gap-2">
              <Save className="w-4 h-4" />
              Save Draft
            </Button>
          </div>

          <Progress value={progress} className="mb-8" />

          {isSubmitting && (
            <Card className="p-4 mb-4">
              <div className="space-y-3">
                <h4 className="font-semibold">Uploading Files...</h4>
                {uploadProgress.logo > 0 && (
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Logo</span>
                      <span>{uploadProgress.logo}%</span>
                    </div>
                    <Progress value={uploadProgress.logo} />
                  </div>
                )}
                {uploadProgress.hero > 0 && (
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Hero Image</span>
                      <span>{uploadProgress.hero}%</span>
                    </div>
                    <Progress value={uploadProgress.hero} />
                  </div>
                )}
                {uploadProgress.gallery > 0 && (
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Gallery Images</span>
                      <span>{uploadProgress.gallery}%</span>
                    </div>
                    <Progress value={uploadProgress.gallery} />
                  </div>
                )}
                {uploadProgress.compliance > 0 && (
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Compliance Documents</span>
                      <span>{uploadProgress.compliance}%</span>
                    </div>
                    <Progress value={uploadProgress.compliance} />
                  </div>
                )}
              </div>
            </Card>
          )}

          <Card className="p-8 shadow-lg">
            {currentStep === 1 && (
              <BasicDetailsStep data={branchData} updateData={updateBranchData} />
            )}
            {currentStep === 2 && (
              <MediaUploadStep data={branchData} updateData={updateBranchData} />
            )}
            {currentStep === 3 && (
              <ServicesStep
                services={branchData.services}
                onChange={(services) => updateBranchData({ services })}
              />
            )}
            {currentStep === 4 && <ReviewStep data={branchData} />}

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
                  {currentStep === 3 ? "Review" : "Next"}
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
    </>
  );
};
