import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Building2, Mail, MapPin, Phone, Clock, Image, FileText } from "lucide-react";

interface ReviewStepProps {
  data: {
    name: string;
    address: string;
    timezone: string;
    phone: string;
    email: string;
    appointment_padding: number;
    logo_file?: File;
    hero_file?: File;
    gallery_files: File[];
    compliance_files: File[];
  };
}

export const ReviewStep = ({ data }: ReviewStepProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-4">Review Branch Details</h3>
        <p className="text-muted-foreground mb-6">
          Please review all information before submitting
        </p>
      </div>

      <div className="space-y-6">
        <div className="bg-accent/20 rounded-lg p-6 space-y-4">
          <div className="flex items-start gap-3">
            <Building2 className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium text-sm text-muted-foreground">Branch Name</p>
              <p className="text-lg font-semibold">{data.name}</p>
            </div>
          </div>

          <Separator />

          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium text-sm text-muted-foreground">Address</p>
              <p className="text-base">{data.address}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm text-muted-foreground">Phone</p>
                <p className="text-base">{data.phone}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm text-muted-foreground">Email</p>
                <p className="text-base">{data.email}</p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm text-muted-foreground">Timezone</p>
                <p className="text-base">{data.timezone}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm text-muted-foreground">Appointment Padding</p>
                <p className="text-base">{data.appointment_padding} minutes</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-accent/20 rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Image className="w-5 h-5 text-primary" />
            <h4 className="font-semibold">Media Files</h4>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Logo</span>
              {data.logo_file ? (
                <Badge variant="default">✓ Uploaded</Badge>
              ) : (
                <Badge variant="secondary">Not uploaded</Badge>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Hero Image</span>
              {data.hero_file ? (
                <Badge variant="default">✓ Uploaded</Badge>
              ) : (
                <Badge variant="secondary">Not uploaded</Badge>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Gallery Images</span>
              <Badge variant="outline">{data.gallery_files.length} files</Badge>
            </div>
          </div>

          <Separator />

          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <h4 className="font-semibold">Compliance Documents</h4>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Documents</span>
            <Badge variant="outline">{data.compliance_files.length} files</Badge>
          </div>
        </div>
      </div>
    </div>
  );
};
