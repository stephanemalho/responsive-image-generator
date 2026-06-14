/**
 * @vitest-environment jsdom
 */
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ResponsiveImageGenerator } from "@/components/responsive-image-generator";

class MockImage {
  naturalWidth = 1600;
  naturalHeight = 900;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;

  set src(_value: string) {
    queueMicrotask(() => this.onload?.());
  }
}

describe("ResponsiveImageGenerator", () => {
  beforeEach(() => {
    vi.stubGlobal("Image", MockImage);
    URL.createObjectURL = vi.fn(() => "blob:preview");
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renders the expected empty state", () => {
    render(<ResponsiveImageGenerator />);

    expect(
      screen.getByRole("button", { name: /deposer une image/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/selectionner une image/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /generer le zip/i })).toBeDisabled();
  });

  it("selects a file and derives the folder name", async () => {
    render(<ResponsiveImageGenerator />);
    const file = new File(["source"], "Hero Image.jpg", { type: "image/jpeg" });

    fireEvent.change(screen.getByLabelText(/selectionner une image/i), {
      target: { files: [file] },
    });

    expect(await screen.findByDisplayValue("hero-image")).toBeInTheDocument();
    expect(await screen.findByText("1600 x 900")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /generer le zip/i })).toBeEnabled();
  });

  it("supports dropping a file into the upload zone", async () => {
    render(<ResponsiveImageGenerator />);
    const file = new File(["source"], "Dropped Hero.png", { type: "image/png" });

    fireEvent.drop(screen.getByRole("button", { name: /deposer une image/i }), {
      dataTransfer: { files: [file] },
    });

    expect(await screen.findByDisplayValue("dropped-hero")).toBeInTheDocument();
  });

  it("normalizes a manually edited folder name", async () => {
    render(<ResponsiveImageGenerator />);
    const input = screen.getByLabelText(/nom du dossier/i);

    fireEvent.change(input, { target: { value: "  Ma Super Image !! " } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(input).toHaveValue("ma-super-image");
    });
  });

  it("shows a clear error for unsupported files", async () => {
    render(<ResponsiveImageGenerator />);
    const file = new File(["<svg />"], "icon.svg", { type: "image/svg+xml" });

    fireEvent.change(screen.getByLabelText(/selectionner une image/i), {
      target: { files: [file] },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Choisissez un JPEG, PNG ou WebP statique.",
    );
  });
});
