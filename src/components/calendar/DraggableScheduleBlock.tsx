import { useState } from "react";
import { Clock, GripVertical, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { getScheduleType, getScheduleTypeBadge, getScheduleTypeIcon } from "@/lib/scheduleTypeUtils";
import { format } from "date-fns";

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
  workingHours?: any;
  overrides?: any[];
  leaveRequests?: any[];
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
  workingHours = {},
  overrides = [],
  leaveRequests = [],
  onDragStart,
  onDragEnd,
}: DraggableScheduleBlockProps) {
  const [isDragging, setIsDragging] = useState(false);

  // Calculate schedule type for this day
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = new Date();
  const dayIndex = dayNames.indexOf(day.toLowerCase());
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() - today.getDay() + dayIndex);

  const scheduleType = getScheduleType(targetDate, workingHours, overrides, leaveRequests);
  const scheduleTypeBadge = getScheduleTypeBadge(scheduleType);
  const scheduleIcon = getScheduleTypeIcon(scheduleType);

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
      <div className="flex items-start justify-between gap-1 mb-1">
        <div className="flex items-center gap-1">
          <GripVertical className="h-3 w-3 opacity-50 group-hover:opacity-100" />
          <span className="text-xs font-medium">{staffName}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-sm">{scheduleIcon}</span>
          {hasConflict && (
            <AlertTriangle className="h-3 w-3 text-white" />
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 mb-1">
        <Clock className="h-3 w-3" />
        <span className="text-xs">
          {slot.start} - {slot.end}
        </span>
      </div>
      <div className="text-[10px] opacity-80 truncate">
        {branchName}
      </div>
      {scheduleType !== 'regular' && (
        <Badge 
          variant="secondary"
          className={cn(
            "text-[9px] px-1 py-0 h-4 mt-1",
            "bg-white/20 text-white border-white/30"
          )}
        >
          {scheduleTypeBadge.label}
        </Badge>
      )}
    </div>
  );
}
