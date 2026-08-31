import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Streams a File/Blob straight from a multipart FormData request to
// Cloudinary — never touches local disk. `folder` groups assets logically
// (e.g. "businesses/logos", "businesses/banners", "products/<id>/documents").
// `resourceType` is "image" for photos (default), "raw" for PDFs/docs —
// the seller product-documents upload route passes "raw" explicitly.
export async function uploadToCloudinary(file, folder, resourceType = "image") {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const uploadOptions = { folder, resource_type: resourceType };

  if (resourceType === "image") {
    // Perceptual quality compression, not a hard resize: Cloudinary picks
    // the lowest bitrate that's visually indistinguishable from the
    // original ("good" — a bit more conservative than "auto" — biases
    // toward keeping quality over squeezing size). fetch_format lets it
    // re-encode into a smaller modern format (e.g. WebP/AVIF) per
    // requesting browser. Product/logo/banner photos also rarely need to
    // exceed 2000px on the long edge, so capping there trims size further
    // without visible loss — remove the width/height/crop lines below if
    // you'd rather keep full original resolution.
    uploadOptions.quality = "auto:good";
    uploadOptions.fetch_format = "auto";
    uploadOptions.width = 2000;
    uploadOptions.height = 2000;
    uploadOptions.crop = "limit"; // only shrinks images larger than this; never upscales or crops content
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    stream.end(buffer);
  });
}