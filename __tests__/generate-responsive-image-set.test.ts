import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { generateResponsiveImageSet } from "@/lib/generate-responsive-image-set";
import { OUTPUT_FORMATS, RESPONSIVE_PRESETS } from "@/lib/responsive-config";

describe("generateResponsiveImageSet", () => {
  it("generates 3 sizes in 3 formats with a valid manifest", async () => {
    const source = await sharp({
      create: {
        width: 1600,
        height: 900,
        channels: 3,
        background: "#47b881",
      },
    })
      .jpeg()
      .toBuffer();

    const result = await generateResponsiveImageSet(source, "hero");

    expect(result.files).toHaveLength(9);
    expect(result.manifest.files).toHaveLength(9);
    expect(result.manifest.source).toMatchObject({
      width: 1600,
      height: 900,
      format: "jpeg",
    });

    for (const format of OUTPUT_FORMATS) {
      for (const preset of RESPONSIVE_PRESETS) {
        const file = result.files.find(
          (item) =>
            item.format === format.extension && item.preset === preset.label,
        );
        expect(file?.filename).toBe(`hero-${preset.label}.${format.extension}`);
        expect(file?.relativePath).toBe(
          `${format.extension}/hero-${preset.label}.${format.extension}`,
        );
        expect(file?.width).toBe(preset.width);
        expect(file?.height).toBe(Math.round(preset.width * (900 / 1600)));
        expect(file?.size).toBeGreaterThan(0);
      }
    }
  });

  it("keeps the source ratio and does not upscale", async () => {
    const source = await sharp({
      create: {
        width: 320,
        height: 180,
        channels: 3,
        background: "#f5a524",
      },
    })
      .png()
      .toBuffer();

    const result = await generateResponsiveImageSet(source, "small");

    expect(result.manifest.warnings).toHaveLength(3);

    for (const file of result.files) {
      expect(file.width).toBe(320);
      expect(file.height).toBe(180);
    }
  });
});
