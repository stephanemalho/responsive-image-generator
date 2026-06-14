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

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return jsonError("Requete multipart/form-data invalide.");
  }

  const image = formData.get("image");
  const requestedFolderName = formData.get("folderName");

  if (!(image instanceof File)) {
    return jsonError("Ajoutez une image JPEG, PNG ou WebP statique.");
  }

  if (image.size > MAX_IMAGE_SIZE) {
    return jsonError("Image trop lourde. La limite v1 est de 25 MB.", 413);
  }

  if (BLOCKED_MIME_TYPES.has(image.type)) {
    return jsonError("SVG, GIF, HEIC et HEIF ne sont pas supportes en v1.");
  }

  if (!SUPPORTED_MIME_TYPES.has(image.type)) {
    return jsonError("Format non supporte. Utilisez JPEG, PNG ou WebP statique.");
  }

  const fallbackName = sanitizeAssetName(filenameStem(image.name));
  const folderName = sanitizeAssetName(
    typeof requestedFolderName === "string" ? requestedFolderName : fallbackName,
    fallbackName,
  );

  try {
    const input = Buffer.from(await image.arrayBuffer());
    const imageSet = await generateResponsiveImageSet(input, folderName);
    const zip = await createResponsiveImageZip(folderName, imageSet);

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
