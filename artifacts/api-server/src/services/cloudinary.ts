import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface UploadResult {
  publicId: string;
  url: string;
  type: string;
  width?: number;
  height?: number;
  duration?: number;
}

export async function uploadMedia(
  file: Buffer,
  folder: string,
  resourceType: "image" | "video" = "image"
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `tattoo-record/${folder}`,
        resource_type: resourceType,
      },
      (error, result) => {
        if (error) {
          reject(new Error(`Cloudinary upload failed: ${error.message}`));
          return;
        }
        if (!result) {
          reject(new Error("Cloudinary upload failed: No result returned"));
          return;
        }

        resolve({
          publicId: result.public_id,
          url: result.secure_url,
          type: result.resource_type,
          width: result.width,
          height: result.height,
          duration: result.duration,
        });
      }
    );

    uploadStream.end(file);
  });
}

export async function deleteMedia(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error: any) {
    throw new Error(`Failed to delete media: ${error.message}`);
  }
}
