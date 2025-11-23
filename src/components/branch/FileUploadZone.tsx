import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface FileUploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  accept: string;
  maxSize: number;
  multiple?: boolean;
}

export const FileUploadZone = ({
  onFilesSelected,
  accept,
  maxSize,
  multiple = false,
}: FileUploadZoneProps) => {
  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      if (rejectedFiles.length > 0) {
        const error = rejectedFiles[0].errors[0];
        if (error.code === "file-too-large") {
          toast.error(`File is too large. Maximum size is ${(maxSize / (1024 * 1024)).toFixed(0)}MB`);
        } else if (error.code === "file-invalid-type") {
          toast.error("Invalid file type");
        } else {
          toast.error("File upload error");
        }
        return;
      }

      if (acceptedFiles.length > 0) {
        onFilesSelected(acceptedFiles);
        toast.success(`${acceptedFiles.length} file(s) uploaded successfully`);
      }
    },
    [onFilesSelected, maxSize]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: accept.split(",").reduce((acc, type) => ({ ...acc, [type.trim()]: [] }), {}),
    maxSize,
    multiple,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all",
        "hover:border-primary hover:bg-accent/5",
        isDragActive ? "border-primary bg-accent/10" : "border-border"
      )}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-3">
        {isDragActive ? (
          <>
            <FileUp className="w-12 h-12 text-primary animate-bounce" />
            <p className="text-primary font-medium">Drop files here</p>
          </>
        ) : (
          <>
            <Upload className="w-12 h-12 text-muted-foreground" />
            <div>
              <p className="font-medium">Click to upload or drag and drop</p>
              <p className="text-sm text-muted-foreground mt-1">
                Maximum file size: {(maxSize / (1024 * 1024)).toFixed(0)}MB
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
