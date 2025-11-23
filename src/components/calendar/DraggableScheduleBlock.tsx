import { useState } from "react";
import { Clock, GripVertical, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DraggableScheduleBlockProps {
  staffId: string;
  staffName: string;
  branchId: string;
  branchName: string;
  branchColor: string;
  day: string;
  slot: {
    start: string;
    end: string;
  };
  hasConflict: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

export default function DraggableScheduleBlock({
  staffId,
  staffName,
  branchId,
  branchName,
  branchColor,
  day,
  slot,
  hasConflict,
  onDragStart,
  onDragEnd,
}: DraggableScheduleBlockProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    
    // Set drag data
    const dragData = {
      staffId,
      staffName,
      branchId,
      branchName,
      slot,
      sourceDay: day,
    };
    
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/json", JSON.stringify(dragData));
    
    // Set drag image
    if (e.currentTarget instanceof HTMLElement) {
      const dragImage = e.currentTarget.cloneNode(true) as HTMLElement;
      dragImage.style.opacity = "0.8";
      document.body.appendChild(dragImage);
      e.dataTransfer.setDragImage(dragImage, 0, 0);
      setTimeout(() => document.body.removeChild(dragImage), 0);
    }
    
    onDragStart?.();
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    onDragEnd?.();
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={cn(
        "text-xs p-2 rounded cursor-move transition-all group relative",
        branchColor,
        "text-white font-medium",
        isDragging && "opacity-50 scale-95",
        !isDragging && "hover:scale-105 hover:shadow-lg",
        hasConflict && "ring-2 ring-destructive ring-offset-1"
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <GripVertical className="h-3 w-3 opacity-50 group-hover:opacity-100" />
        <div className="flex items-center gap-1 flex-1">
          <Clock className="h-3 w-3" />
          <span>
            {slot.start} - {slot.end}
          </span>
        </div>
        {hasConflict && (
          <AlertTriangle className="h-3 w-3 text-white" />
        )}
      </div>
      <div className="text-[10px] opacity-80 mt-0.5 truncate">
        {branchName}
      </div>
    </div>
  );
}
