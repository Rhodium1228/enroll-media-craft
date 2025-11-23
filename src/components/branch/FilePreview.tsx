import { FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FilePreviewProps {
  file: File;
  onRemove: () => void;
}

export const FilePreview = ({ file, onRemove }: FilePreviewProps) => {
  const getFileIcon = () => {
    if (file.type.includes("pdf")) return "📄";
    if (file.type.includes("image")) return "🖼️";
    return "📎";
  };

  return (
    <div className="flex items-center justify-between p-3 bg-accent/10 rounded-lg border group hover:bg-accent/20 transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="text-2xl">{getFileIcon()}</div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{file.name}</p>
          <p className="text-xs text-muted-foreground">
            {(file.size / 1024).toFixed(1)} KB
          </p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onRemove}
        className="opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
};
