import { loadMindARCompiler } from "./mindarLoader";

export async function compileMindFile(
  imageFile: File,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const imageUrl = URL.createObjectURL(imageFile);

  try {
    const img = await loadImage(imageUrl);
    const Compiler = await loadMindARCompiler();
    const compiler = new Compiler();

    await compiler.compileImageTargets([img], (progress: number) => {
      onProgress?.(Math.round(progress * 100));
    });

    const exported = compiler.exportData();
    return new Blob([exported], { type: "application/octet-stream" });
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.crossOrigin = "anonymous";
    img.src = src;
  });
}

export function validateVideoFile(file: File): string | null {
  const validTypes = [
    "video/mp4",
    "video/quicktime",
    "video/webm",
    "video/x-matroska",
    "video/avi",
    "video/x-msvideo",
    "video/mpeg",
  ];
  const validExtensions = [".mp4", ".mov", ".webm", ".mkv", ".avi", ".mpeg", ".mpg"];
  const fileNameLower = file.name.toLowerCase();
  const hasValidExtension = validExtensions.some((ext) => fileNameLower.endsWith(ext));

  if (!validTypes.includes(file.type) && !hasValidExtension) {
    return "Please upload a valid video format (MP4, MOV, WebM, MKV, AVI)";
  }
  if (file.size > 50 * 1024 * 1024) {
    return "Video must be under 50MB";
  }
  return null;
}

export function validatePhotoFile(file: File): string | null {
  const validTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!validTypes.includes(file.type)) {
    return "Please upload a JPG, PNG, or WebP photo";
  }
  if (file.size > 10 * 1024 * 1024) {
    return "Photo must be under 10MB";
  }
  return null;
}
