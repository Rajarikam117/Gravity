import { apiFetch } from "./api";

const IMAGEKIT_PUBLIC_KEY = "public_GOsNdLK62CEBfaZxAHbTyU8Q+wA=";
const IMAGEKIT_UPLOAD_URL = "https://upload.imagekit.io/api/v1/files/upload";

interface ImageKitAuthParams {
  token: string;
  signature: string;
  expire: number;
}

interface ImageKitUploadResult {
  url: string;
  filePath: string;
  fileId: string;
  name: string;
}

/** Fetch auth params from our backend (requires user session) */
async function getAuthParams(accessToken: string): Promise<ImageKitAuthParams> {
  return apiFetch<ImageKitAuthParams>(
    "/api/uploads/auth",
    {},
    accessToken
  );
}

/** Upload a single file directly from the browser to ImageKit.
 *  This bypasses the Vercel serverless 4.5MB body limit. */
export async function uploadToImageKit(
  file: File | Blob,
  fileName: string,
  folder: string,
  accessToken: string,
  onProgress?: (percent: number) => void
): Promise<ImageKitUploadResult> {
  // Get fresh auth params for each upload
  const auth = await getAuthParams(accessToken);

  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file, fileName);
    formData.append("fileName", fileName);
    formData.append("folder", folder);
    formData.append("publicKey", IMAGEKIT_PUBLIC_KEY);
    formData.append("token", auth.token);
    formData.append("signature", auth.signature);
    formData.append("expire", String(auth.expire));
    formData.append("useUniqueFileName", "true");
    formData.append("tags", "gravity");
    formData.append("responseFields", "url,filePath,fileId");

    const xhr = new XMLHttpRequest();
    xhr.open("POST", IMAGEKIT_UPLOAD_URL);

    // Track upload progress
    if (onProgress) {
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      });
    }

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const result = JSON.parse(xhr.responseText);
          resolve({
            url: result.url,
            filePath: result.filePath,
            fileId: result.fileId,
            name: result.name,
          });
        } catch {
          reject(new Error("Invalid response from ImageKit"));
        }
      } else {
        let errorMessage = `Upload failed (${xhr.status})`;
        try {
          const errorData = JSON.parse(xhr.responseText);
          errorMessage = errorData.message || errorMessage;
        } catch { /* use default */ }
        reject(new Error(errorMessage));
      }
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Network error during upload"));
    });

    xhr.addEventListener("abort", () => {
      reject(new Error("Upload was cancelled"));
    });

    xhr.send(formData);
  });
}
