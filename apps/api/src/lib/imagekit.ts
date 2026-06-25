import ImageKit from "imagekit";

const publicKey = process.env.IMAGEKIT_PUBLIC_KEY;
const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;

if (!publicKey || !privateKey || !urlEndpoint) {
  console.warn("ImageKit credentials missing — upload routes will fail until configured.");
}

export const imagekit = new ImageKit({
  publicKey: publicKey ?? "",
  privateKey: privateKey ?? "",
  urlEndpoint: urlEndpoint ?? "",
});

export function getImageKitUrl(path: string, transformations?: string): string {
  const base = `${urlEndpoint?.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
  if (transformations) {
    return `${base}?tr=${transformations}`;
  }
  return base;
}

export async function uploadBuffer(
  buffer: Buffer,
  fileName: string,
  folder: string,
  mimeType: string
) {
  return imagekit.upload({
    file: buffer,
    fileName,
    folder,
    useUniqueFileName: true,
    tags: ["gravity"],
    responseFields: "url,filePath,fileId",
  });
}

/** Generate auth parameters for client-side (browser) uploads to ImageKit.
 *  This is needed because Vercel serverless functions have a ~4.5MB body limit,
 *  so large files (videos, photos) must be uploaded directly from the browser. */
export function getUploadAuthParams() {
  return imagekit.getAuthenticationParameters();
}
