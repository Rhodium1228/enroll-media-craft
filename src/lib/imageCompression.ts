import imageCompression from "browser-image-compression";

export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
}

export async function compressLogo(file: File): Promise<CompressionResult> {
  const originalSize = file.size;

  const options = {
    maxSizeMB: 0.2, // 200KB
    maxWidthOrHeight: 512,
    useWebWorker: true,
    fileType: "image/jpeg",
  };

  try {
    const compressedFile = await imageCompression(file, options);
    const newFile = new File([compressedFile], file.name, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });

    return {
      file: newFile,
      originalSize,
      compressedSize: newFile.size,
    };
  } catch (error) {
    console.error("Error compressing logo:", error);
    throw error;
  }
}

export async function compressHeroImage(file: File): Promise<CompressionResult> {
  const originalSize = file.size;

  const options = {
    maxSizeMB: 0.5, // 500KB
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: "image/jpeg",
  };

  try {
    const compressedFile = await imageCompression(file, options);
    const newFile = new File([compressedFile], file.name, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });

    return {
      file: newFile,
      originalSize,
      compressedSize: newFile.size,
    };
  } catch (error) {
    console.error("Error compressing hero image:", error);
    throw error;
  }
}

export async function compressGalleryImage(file: File): Promise<CompressionResult> {
  const originalSize = file.size;

  const options = {
    maxSizeMB: 0.4, // 400KB
    maxWidthOrHeight: 1200,
    useWebWorker: true,
    fileType: "image/jpeg",
  };

  try {
    const compressedFile = await imageCompression(file, options);
    const newFile = new File([compressedFile], file.name, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });

    return {
      file: newFile,
      originalSize,
      compressedSize: newFile.size,
    };
  } catch (error) {
    console.error("Error compressing gallery image:", error);
    throw error;
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
}
