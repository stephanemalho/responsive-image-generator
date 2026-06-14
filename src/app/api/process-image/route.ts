import { NextResponse } from "next/server";

import {
  generateResponsiveImageSet,
  ImageProcessingError,
} from "@/lib/generate-responsive-image-set";
import { filenameStem, sanitizeAssetName } from "@/lib/names";
import { createResponsiveImageZip } from "@/lib/zip-responsive-image-set";

export const runtime = "nodejs";

const MAX_IMAGE_SIZE = 25 * 1024 * 1024;
const SUPPORTED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const BLOCKED_MIME_TYPES = new Set([
  "image/svg+xml",
  "image/gif",
  "image/heic",
  "image/heif",
]);

function getImages(formData: FormData) {
  const images = formData.getAll("images").filter((item) => item instanceof File);
  const fallbackImage = formData.get("image");

  if (images.length > 0) {
    return images;
  }

  return fallbackImage instanceof File ? [fallbackImage] : [];
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function validateImage(image: File) {
  if (image.size > MAX_IMAGE_SIZE) {
    return {
      message: `${image.name}: image trop lourde. La limite v1 est de 25 MB.`,
      status: 413,
    };
  }

  if (BLOCKED_MIME_TYPES.has(image.type)) {
    return {
      message: `${image.name}: SVG, GIF, HEIC et HEIF ne sont pas supportes en v1.`,
      status: 400,
    };
  }

  if (!SUPPORTED_MIME_TYPES.has(image.type)) {
    return {
      message: `${image.name}: format non supporte. Utilisez JPEG, PNG ou WebP statique.`,
      status: 400,
    };
  }

  return null;
}

export async function POST(request: Request) {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return jsonError("Requete multipart/form-data invalide.");
  }

  const images = getImages(formData);
  const requestedFolderName = formData.get("folderName");

  if (images.length === 0) {
    return jsonError("Ajoutez une ou plusieurs images JPEG, PNG ou WebP statiques.");
  }

  for (const image of images) {
    const validationError = validateImage(image);
    if (validationError) {
      return jsonError(validationError.message, validationError.status);
    }
  }

  const fallbackName = sanitizeAssetName(filenameStem(images[0].name));
  const folderName = sanitizeAssetName(
    typeof requestedFolderName === "string" ? requestedFolderName : fallbackName,
    fallbackName,
  );

  try {
    const entries = await Promise.all(
      images.map(async (image, index) => {
        const assetName =
          images.length > 1 ? `${folderName}-${index + 1}` : folderName;
        const input = Buffer.from(await image.arrayBuffer());
        const imageSet = await generateResponsiveImageSet(input, assetName);

        return {
          index: index + 1,
          sourceFilename: image.name,
          assetName,
          imageSet,
        };
      }),
    );
    const zip = await createResponsiveImageZip(folderName, entries);

    return new NextResponse(Buffer.from(zip), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${folderName}-responsive.zip"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof ImageProcessingError) {
      return jsonError(error.message);
    }

    console.error(error);
    return jsonError("La generation a echoue.", 500);
  }
}
