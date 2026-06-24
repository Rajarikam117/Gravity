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
