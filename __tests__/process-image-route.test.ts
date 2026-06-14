import JSZip from "jszip";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { POST } from "@/app/api/process-image/route";

async function createFile(
  type: string,
  filename: string,
  buffer?: Buffer,
  size?: number,
) {
  const content =
    buffer ??
    (await sharp({
      create: {
        width: 640,
        height: 360,
        channels: 3,
        background: "#2f80ed",
      },
    })
      .jpeg()
      .toBuffer());

  const body = size ? new Uint8Array(size) : new Uint8Array(content);
  return new File([body], filename, { type });
}

async function createRequest(file: File, folderName = "Hero Image") {
  const formData = new FormData();
  formData.set("image", file);
  formData.set("folderName", folderName);

  return new Request("http://localhost/api/process-image", {
    method: "POST",
    body: formData,
  });
}

async function createMultiImageRequest(files: File[], folderName = "Oscar") {
  const formData = new FormData();
  for (const file of files) {
    formData.append("images", file);
  }
  formData.set("folderName", folderName);

  return new Request("http://localhost/api/process-image", {
    method: "POST",
    body: formData,
  });
}

describe("POST /api/process-image", () => {
  it("returns a ZIP for a valid upload", async () => {
    const file = await createFile("image/jpeg", "hero.jpg");
    const response = await POST(await createRequest(file));
    const buffer = Buffer.from(await response.arrayBuffer());
    const zip = await JSZip.loadAsync(buffer);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/zip");
    expect(zip.file("hero-image/manifest.json")).toBeTruthy();
    expect(zip.file("hero-image/avif/hero-image-mobile.avif")).toBeTruthy();
    expect(zip.file("hero-image/webp/hero-image-tablet.webp")).toBeTruthy();
    expect(zip.file("hero-image/jpeg/hero-image-desktop.jpeg")).toBeTruthy();
  });

  it("returns one ZIP folder with prefixed files for multiple uploads", async () => {
    const firstFile = await createFile("image/jpeg", "front.jpg");
    const secondFile = await createFile("image/jpeg", "profile.jpg");
    const response = await POST(
      await createMultiImageRequest([firstFile, secondFile]),
    );
    const buffer = Buffer.from(await response.arrayBuffer());
    const zip = await JSZip.loadAsync(buffer);
    const manifest = JSON.parse(
      await zip.file("oscar/manifest.json")!.async("string"),
    ) as { imageCount: number; images: Array<{ assetName: string }> };

    expect(response.status).toBe(200);
    expect(zip.file("oscar/avif/oscar-1-mobile.avif")).toBeTruthy();
    expect(zip.file("oscar/webp/oscar-2-tablet.webp")).toBeTruthy();
    expect(zip.file("oscar/jpeg/oscar-2-desktop.jpeg")).toBeTruthy();
    expect(manifest.imageCount).toBe(2);
    expect(manifest.images.map((image) => image.assetName)).toEqual([
      "oscar-1",
      "oscar-2",
    ]);
  });

  it("rejects unsupported image types with a clear error", async () => {
    const file = await createFile("image/svg+xml", "icon.svg", Buffer.from(""));
    const response = await POST(await createRequest(file));
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(data.error).toContain("SVG");
  });

  it("rejects images larger than 25 MB with a clear error", async () => {
    const file = await createFile(
      "image/jpeg",
      "large.jpg",
      undefined,
      25 * 1024 * 1024 + 1,
    );
    const response = await POST(await createRequest(file));
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(413);
    expect(data.error).toContain("25 MB");
  });
});
