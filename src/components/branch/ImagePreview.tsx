import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImagePreviewProps {
  file: File;
  onRemove: () => void;
}

export const ImagePreview = ({ file, onRemove }: ImagePreviewProps) => {
  const [preview, setPreview] = useState<string>("");

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className="relative group rounded-lg overflow-hidden border bg-card">
      <img
        src={preview}
        alt={file.name}
        className="w-full h-48 object-cover"
      />
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <Button
          variant="destructive"
          size="sm"
          onClick={onRemove}
          className="gap-2"
        >
          <X className="w-4 h-4" />
          Remove
        </Button>
      </div>
      <div className="p-2 bg-card">
        <p className="text-sm font-medium truncate">{file.name}</p>
        <p className="text-xs text-muted-foreground">
          {(file.size / 1024).toFixed(1)} KB
        </p>
      </div>
    </div>
  );
};
