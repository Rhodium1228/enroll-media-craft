import { useState } from "react";
import { FileUploadZone } from "@/components/branch/FileUploadZone";
import { ImagePreview } from "@/components/branch/ImagePreview";
import { FilePreview } from "@/components/branch/FilePreview";
import { ImageCropper } from "@/components/branch/ImageCropper";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Info, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  validateLogo,
  validateHero,
  validateGalleryImage,
  validateComplianceDoc,
} from "@/lib/validation/branchSchema";
import {
  compressLogo,
  compressHeroImage,
  compressGalleryImage,
  formatFileSize,
} from "@/lib/imageCompression";

interface MediaUploadStepProps {
  data: {
    logo_file?: File;
    hero_file?: File;
    gallery_files: File[];
    compliance_files: File[];
  };
  updateData: (data: any) => void;
}

export const MediaUploadStep = ({ data, updateData }: MediaUploadStepProps) => {
  const [cropConfig, setCropConfig] = useState<{
    image: string;
    aspectRatio: number;
    type: "logo" | "hero";
    originalFile: File;
  } | null>(null);

  const handleLogoUpload = async (files: File[]) => {
    if (files.length === 0) return;

    const file = files[0];
    const error = validateLogo(file);
    if (error) {
      toast.error(error);
      return;
    }

    // Show cropper
    const reader = new FileReader();
    reader.onload = () => {
      setCropConfig({
        image: reader.result as string,
        aspectRatio: 1, // 1:1 square
        type: "logo",
        originalFile: file,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleHeroUpload = async (files: File[]) => {
    if (files.length === 0) return;

    const file = files[0];
    const error = validateHero(file);
    if (error) {
      toast.error(error);
      return;
    }

    // Show cropper
    const reader = new FileReader();
    reader.onload = () => {
      setCropConfig({
        image: reader.result as string,
        aspectRatio: 16 / 9, // 16:9 landscape
        type: "hero",
        originalFile: file,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    if (!cropConfig) return;

    try {
      const croppedFile = new File([croppedBlob], cropConfig.originalFile.name, {
        type: "image/jpeg",
        lastModified: Date.now(),
      });

      // Compress the cropped image
      let compressedResult;
      if (cropConfig.type === "logo") {
        compressedResult = await compressLogo(croppedFile);
        toast.success(
          `Logo compressed: ${formatFileSize(compressedResult.originalSize)} → ${formatFileSize(
            compressedResult.compressedSize
          )}`
        );
        updateData({ logo_file: compressedResult.file });
      } else {
        compressedResult = await compressHeroImage(croppedFile);
        toast.success(
          `Hero image compressed: ${formatFileSize(
            compressedResult.originalSize
          )} → ${formatFileSize(compressedResult.compressedSize)}`
        );
        updateData({ hero_file: compressedResult.file });
      }

      setCropConfig(null);
    } catch (error) {
      console.error("Error processing image:", error);
      toast.error("Failed to process image");
    }
  };

  const handleGalleryUpload = async (files: File[]) => {
    const validFiles: File[] = [];

    for (const file of files) {
      const error = validateGalleryImage(file);
      if (error) {
        toast.error(`${file.name}: ${error}`);
        continue;
      }

      try {
        const compressed = await compressGalleryImage(file);
        validFiles.push(compressed.file);
        toast.success(
          `${file.name} compressed: ${formatFileSize(compressed.originalSize)} → ${formatFileSize(
            compressed.compressedSize
          )}`
        );
      } catch (error) {
        toast.error(`Failed to compress ${file.name}`);
      }
    }

    if (validFiles.length > 0) {
      updateData({ gallery_files: [...data.gallery_files, ...validFiles] });
    }
  };

  const handleComplianceUpload = (files: File[]) => {
    const validFiles: File[] = [];

    for (const file of files) {
      const error = validateComplianceDoc(file);
      if (error) {
        toast.error(`${file.name}: ${error}`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      updateData({ compliance_files: [...data.compliance_files, ...validFiles] });
    }
  };

  const removeGalleryImage = (index: number) => {
    const newFiles = [...data.gallery_files];
    newFiles.splice(index, 1);
    updateData({ gallery_files: newFiles });
  };

  const removeComplianceFile = (index: number) => {
    const newFiles = [...data.compliance_files];
    newFiles.splice(index, 1);
    updateData({ compliance_files: newFiles });
  };

  return (
    <>
      {cropConfig && (
        <ImageCropper
          image={cropConfig.image}
          aspectRatio={cropConfig.aspectRatio}
          onCropComplete={handleCropComplete}
          onCancel={() => setCropConfig(null)}
          title={
            cropConfig.type === "logo"
              ? "Crop Logo (1:1 Square)"
              : "Crop Hero Image (16:9 Landscape)"
          }
        />
      )}

      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-semibold mb-4">Branch Media & Documents</h3>
          <p className="text-muted-foreground mb-6">
            Upload branch branding, images, and compliance documents
          </p>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              <strong>Required:</strong> Logo (2MB max) and Hero Image (4MB max).{" "}
              <strong>Optional:</strong> Gallery images and compliance documents (10MB max each).
            </span>
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="w-3 h-3" />
              Auto-compressed
            </Badge>
          </AlertDescription>
        </Alert>

      <div className="space-y-6">
        <div className="space-y-3">
          <h4 className="font-medium">Branch Logo *</h4>
          <p className="text-sm text-muted-foreground">
            Square or 1:1 ratio recommended. PNG, JPG, or SVG up to 2MB.
          </p>
          {data.logo_file ? (
            <ImagePreview
              file={data.logo_file}
              onRemove={() => updateData({ logo_file: undefined })}
            />
          ) : (
            <FileUploadZone
              onFilesSelected={handleLogoUpload}
              accept="image/png,image/jpeg,image/svg+xml"
              maxSize={2 * 1024 * 1024}
              multiple={false}
            />
          )}
        </div>

        <div className="space-y-3">
          <h4 className="font-medium">Hero Banner Image *</h4>
          <p className="text-sm text-muted-foreground">
            16:9 aspect ratio recommended. JPG or PNG up to 4MB.
          </p>
          {data.hero_file ? (
            <ImagePreview
              file={data.hero_file}
              onRemove={() => updateData({ hero_file: undefined })}
            />
          ) : (
            <FileUploadZone
              onFilesSelected={handleHeroUpload}
              accept="image/jpeg,image/png"
              maxSize={4 * 1024 * 1024}
              multiple={false}
            />
          )}
        </div>

        <div className="space-y-3">
          <h4 className="font-medium">Gallery Images (Optional)</h4>
          <p className="text-sm text-muted-foreground">
            Up to 10 images for website and marketing. 1-4MB each.
          </p>
          {data.gallery_files.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {data.gallery_files.map((file, index) => (
                <ImagePreview
                  key={index}
                  file={file}
                  onRemove={() => removeGalleryImage(index)}
                />
              ))}
            </div>
          )}
          {data.gallery_files.length < 10 && (
            <FileUploadZone
              onFilesSelected={handleGalleryUpload}
              accept="image/jpeg,image/png"
              maxSize={4 * 1024 * 1024}
              multiple={true}
            />
          )}
        </div>

        <div className="space-y-3">
          <h4 className="font-medium">Compliance Documents (Optional)</h4>
          <p className="text-sm text-muted-foreground">
            Business license, safety certificates, insurance. PDF, JPG, or PNG up to 10MB each.
          </p>
          {data.compliance_files.length > 0 && (
            <div className="space-y-2 mb-4">
              {data.compliance_files.map((file, index) => (
                <FilePreview
                  key={index}
                  file={file}
                  onRemove={() => removeComplianceFile(index)}
                />
              ))}
            </div>
          )}
          {data.compliance_files.length < 10 && (
            <FileUploadZone
              onFilesSelected={handleComplianceUpload}
              accept="application/pdf,image/jpeg,image/png"
              maxSize={10 * 1024 * 1024}
              multiple={true}
            />
          )}
        </div>
        </div>
      </div>
    </>
  );
};
