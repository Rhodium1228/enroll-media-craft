import { useState } from "react";
import { cn } from "@/lib/utils";

interface DroppableDayCellProps {
  day: string;
  children: React.ReactNode;
  onDrop: (dragData: any, targetDay: string) => void;
  className?: string;
}

export default function DroppableDayCell({
  day,
  children,
  onDrop,
  className,
}: DroppableDayCellProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    try {
      const dragData = JSON.parse(e.dataTransfer.getData("application/json"));
      onDrop(dragData, day);
    } catch (error) {
      console.error("Error parsing drag data:", error);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "min-h-[60px] rounded-lg border-2 p-2 transition-all",
        isDragOver
          ? "border-primary bg-primary/10 scale-105 shadow-lg"
          : "border-border",
        className
      )}
    >
      {children}
    </div>
  );
}
