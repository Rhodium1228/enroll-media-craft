import { FileUploadZone } from "@/components/branch/FileUploadZone";
import { ImagePreview } from "@/components/branch/ImagePreview";
import { FilePreview } from "@/components/branch/FilePreview";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

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
  const handleLogoUpload = (files: File[]) => {
    if (files.length > 0) {
      updateData({ logo_file: files[0] });
    }
  };

  const handleHeroUpload = (files: File[]) => {
    if (files.length > 0) {
      updateData({ hero_file: files[0] });
    }
  };

  const handleGalleryUpload = (files: File[]) => {
    updateData({ gallery_files: [...data.gallery_files, ...files] });
  };

  const handleComplianceUpload = (files: File[]) => {
    updateData({ compliance_files: [...data.compliance_files, ...files] });
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
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-4">Branch Media & Documents</h3>
        <p className="text-muted-foreground mb-6">
          Upload branch branding, images, and compliance documents
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Required:</strong> Logo (2MB max) and Hero Image (4MB max).{" "}
          <strong>Optional:</strong> Gallery images and compliance documents (10MB max each).
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
  );
};
