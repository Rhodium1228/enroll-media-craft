import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

interface ServiceImageGalleryProps {
  images: string[];
  serviceName: string;
  className?: string;
}

export function ServiceImageGallery({ images, serviceName, className }: ServiceImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);

  if (!images || images.length === 0) {
    return (
      <div className={cn("w-full h-48 bg-muted flex items-center justify-center", className)}>
        <p className="text-muted-foreground text-sm">No images available</p>
      </div>
    );
  }

  // Single image - simple display
  if (images.length === 1) {
    return (
      <div className={cn("relative w-full h-48 overflow-hidden cursor-pointer", className)} onClick={() => setFullscreenOpen(true)}>
        <img
          src={images[0]}
          alt={serviceName}
          className="w-full h-full object-cover"
        />
        {fullscreenOpen && (
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setFullscreenOpen(false)}>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-white hover:bg-white/20"
              onClick={() => setFullscreenOpen(false)}
            >
              <X className="h-6 w-6" />
            </Button>
            <img
              src={images[0]}
              alt={serviceName}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        )}
      </div>
    );
  }

  // Multiple images - carousel
  return (
    <>
      <div className={cn("relative", className)}>
        <Carousel className="w-full" opts={{ loop: true }}>
          <CarouselContent>
            {images.map((image, index) => (
              <CarouselItem key={index}>
                <div 
                  className="relative w-full h-48 overflow-hidden cursor-pointer"
                  onClick={() => {
                    setSelectedIndex(index);
                    setFullscreenOpen(true);
                  }}
                >
                  <img
                    src={image}
                    alt={`${serviceName} - Image ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-2" />
          <CarouselNext className="right-2" />
        </Carousel>
        
        {/* Image counter badge */}
        <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
          {images.length} images
        </div>
      </div>

      {/* Fullscreen carousel modal */}
      {fullscreenOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20 z-10"
            onClick={() => setFullscreenOpen(false)}
          >
            <X className="h-6 w-6" />
          </Button>

          <div className="relative w-full max-w-4xl flex items-center justify-center">
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 text-white hover:bg-white/20 z-10"
              onClick={() => setSelectedIndex((prev) => (prev - 1 + images.length) % images.length)}
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>

            <img
              src={images[selectedIndex]}
              alt={`${serviceName} - Image ${selectedIndex + 1}`}
              className="max-w-full max-h-[80vh] object-contain"
            />

            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 text-white hover:bg-white/20 z-10"
              onClick={() => setSelectedIndex((prev) => (prev + 1) % images.length)}
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          </div>

          {/* Thumbnail navigation */}
          <div className="mt-4 flex gap-2 overflow-x-auto max-w-full px-4">
            {images.map((image, index) => (
              <button
                key={index}
                onClick={() => setSelectedIndex(index)}
                className={cn(
                  "flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all",
                  selectedIndex === index
                    ? "border-white scale-110"
                    : "border-transparent opacity-60 hover:opacity-100"
                )}
              >
                <img
                  src={image}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>

          {/* Counter */}
          <div className="mt-4 text-white text-sm">
            {selectedIndex + 1} / {images.length}
          </div>
        </div>
      )}
    </>
  );
}
