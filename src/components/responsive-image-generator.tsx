"use client";

import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileArchive,
  ImagePlus,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { filenameStem, sanitizeAssetName } from "@/lib/names";
import { RESPONSIVE_PRESETS } from "@/lib/responsive-config";

type ImageInfo = {
  url: string;
  width: number;
  height: number;
};

type SelectedImage = {
  id: string;
  file: File;
  info: ImageInfo;
};

type GenerationState = "idle" | "loading" | "success" | "error";

const MAX_IMAGE_SIZE = 25 * 1024 * 1024;
const SUPPORTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const FORMAT_OUTPUTS = ["avif", "webp", "jpeg"] as const;

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ["KB", "MB", "GB"];
  let size = bytes / 1024;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

function loadImageInfo(file: File) {
  return new Promise<ImageInfo>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      resolve({
        url,
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Impossible de lire l'apercu."));
    };
    image.src = url;
  });
}

async function downloadZip(files: File[], folderName: string) {
  const formData = new FormData();
  for (const file of files) {
    formData.append("images", file);
  }
  formData.set("folderName", folderName);

  const response = await fetch("/api/process-image", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(data?.error ?? "La generation a echoue.");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${folderName}-responsive.zip`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function ResponsiveImageGenerator() {
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [folderName, setFolderName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [state, setState] = useState<GenerationState>("idle");
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const firstImage = selectedImages[0];
  const selectedFiles = selectedImages.map((image) => image.file);
  const totalSize = selectedFiles.reduce((size, file) => size + file.size, 0);

  useEffect(() => {
    return () => {
      for (const image of selectedImages) {
        URL.revokeObjectURL(image.info.url);
      }
    };
  }, [selectedImages]);

  const expectedOutputs = useMemo(() => {
    return RESPONSIVE_PRESETS.map((preset) => {
      const outputWidth = firstImage
        ? Math.min(firstImage.info.width, preset.width)
        : preset.width;
      const outputHeight = firstImage
        ? Math.round((outputWidth / firstImage.info.width) * firstImage.info.height)
        : null;

      return {
        ...preset,
        outputWidth,
        outputHeight,
        warning: Boolean(
          selectedImages.some((image) => image.info.width < preset.width),
        ),
      };
    });
  }, [firstImage, selectedImages]);

  async function selectFiles(nextFiles: File[]) {
    if (nextFiles.length === 0) {
      return;
    }

    setState("idle");
    setMessage("");

    const unsupportedFile = nextFiles.find(
      (file) => !SUPPORTED_TYPES.includes(file.type),
    );
    if (unsupportedFile) {
      clearFiles();
      setMessage(`${unsupportedFile.name}: choisissez un JPEG, PNG ou WebP statique.`);
      setState("error");
      return;
    }

    const oversizedFile = nextFiles.find((file) => file.size > MAX_IMAGE_SIZE);
    if (oversizedFile) {
      clearFiles();
      setMessage(`${oversizedFile.name}: image trop lourde. La limite v1 est de 25 MB.`);
      setState("error");
      return;
    }

    try {
      const images = await Promise.all(
        nextFiles.map(async (file, index) => ({
          id: `${file.name}-${file.size}-${file.lastModified}-${index}`,
          file,
          info: await loadImageInfo(file),
        })),
      );

      setSelectedImages((previousImages) => {
        for (const image of previousImages) {
          URL.revokeObjectURL(image.info.url);
        }

        return images;
      });
      setFolderName(sanitizeAssetName(filenameStem(nextFiles[0].name)));
    } catch (error) {
      clearFiles();
      setMessage(
        error instanceof Error ? error.message : "Impossible de lire l'image.",
      );
      setState("error");
    }
  }

  async function handleGenerate() {
    if (selectedImages.length === 0) {
      setMessage("Ajoutez au moins une image avant de generer le ZIP.");
      setState("error");
      return;
    }

    const safeFolderName = sanitizeAssetName(folderName);
    setFolderName(safeFolderName);
    setState("loading");
    setMessage("");

    try {
      await downloadZip(selectedFiles, safeFolderName);
      setMessage(
        `ZIP genere pour ${selectedImages.length} image${selectedImages.length > 1 ? "s" : ""}.`,
      );
      setState("success");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "La generation a echoue.",
      );
      setState("error");
    }
  }

  function clearFiles() {
    setSelectedImages((previousImages) => {
      for (const image of previousImages) {
        URL.revokeObjectURL(image.info.url);
      }

      return [];
    });
    setFolderName("");
    setMessage("");
    setState("idle");
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 gap-6 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_390px] lg:px-8">
        <section className="flex min-h-[620px] flex-col gap-5 rounded-lg border border-black/10 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-2 border-b border-black/10 pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-emerald-700">
                Local image pipeline
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-stone-950 sm:text-3xl">
                Generateur responsive
              </h1>
            </div>
            <div className="flex items-center gap-2 text-sm text-stone-600">
              <FileArchive aria-hidden className="size-4" />
              <span>AVIF / WebP / JPEG</span>
            </div>
          </div>

          <div className="grid flex-1 grid-cols-1 gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
            <div className="flex flex-col gap-4">
              <input
                ref={inputRef}
                aria-label="Selectionner une ou plusieurs images"
                className="sr-only"
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) =>
                  selectFiles(Array.from(event.target.files ?? []))
                }
              />

              <button
                className={[
                  "flex min-h-[250px] w-full flex-col items-center justify-center gap-4 rounded-lg border border-dashed p-6 text-center transition",
                  isDragging
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-stone-300 bg-stone-50 hover:border-stone-500 hover:bg-stone-100",
                ].join(" ")}
                type="button"
                onClick={() => inputRef.current?.click()}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setIsDragging(false);
                  void selectFiles(Array.from(event.dataTransfer.files));
                }}
              >
                <span className="flex size-12 items-center justify-center rounded-lg bg-stone-950 text-white">
                  <ImagePlus aria-hidden className="size-6" />
                </span>
                <span className="text-base font-medium text-stone-950">
                  Deposer une ou plusieurs images
                </span>
                <span className="max-w-60 text-sm leading-6 text-stone-600">
                  JPEG, PNG ou WebP statique, 25 MB max par image.
                </span>
              </button>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-stone-800">
                  Nom du dossier
                </span>
                <input
                  className="h-11 rounded-md border border-stone-300 bg-white px-3 font-mono text-sm text-stone-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  placeholder="nom-image"
                  value={folderName}
                  onBlur={() => setFolderName(sanitizeAssetName(folderName))}
                  onChange={(event) => setFolderName(event.target.value)}
                />
              </label>

              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-stone-950 px-4 text-sm font-medium text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-300"
                type="button"
                disabled={selectedImages.length === 0 || state === "loading"}
                onClick={() => void handleGenerate()}
              >
                {state === "loading" ? (
                  <Loader2 aria-hidden className="size-4 animate-spin" />
                ) : (
                  <Download aria-hidden className="size-4" />
                )}
                Generer le ZIP
              </button>

              {message ? (
                <div
                  className={[
                    "flex items-start gap-2 rounded-md border px-3 py-2 text-sm",
                    state === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                      : "border-red-200 bg-red-50 text-red-900",
                  ].join(" ")}
                  role={state === "error" ? "alert" : "status"}
                >
                  {state === "success" ? (
                    <CheckCircle2 aria-hidden className="mt-0.5 size-4" />
                  ) : (
                    <AlertCircle aria-hidden className="mt-0.5 size-4" />
                  )}
                  <span>{message}</span>
                </div>
              ) : null}
            </div>

            <div className="flex min-w-0 flex-col gap-4">
              <div className="relative flex min-h-85 items-center justify-center overflow-hidden rounded-lg border border-stone-200 bg-[linear-gradient(45deg,#f5f5f4_25%,transparent_25%),linear-gradient(-45deg,#f5f5f4_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f5f5f4_75%),linear-gradient(-45deg,transparent_75%,#f5f5f4_75%)] bg-[length:22px_22px] bg-[position:0_0,0_11px,11px_-11px,-11px_0]">
                {firstImage ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt="Apercu de la premiere image source"
                      className="max-h-[520px] w-auto max-w-full object-contain"
                      src={firstImage.info.url}
                    />
                    <button
                      aria-label="Retirer les images"
                      className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-md bg-white/95 text-stone-800 shadow-sm ring-1 ring-black/10 transition hover:bg-white"
                      type="button"
                      onClick={clearFiles}
                    >
                      <X aria-hidden className="size-4" />
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-3 text-stone-500">
                    <Upload aria-hidden className="size-8" />
                    <span className="text-sm">Aucun fichier selectionne</span>
                  </div>
                )}
              </div>

              {firstImage ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Metric label="Images" value={`${selectedImages.length}`} />
                  <Metric label="Poids total" value={formatBytes(totalSize)} />
                  <Metric
                    label="Premiere"
                    value={`${firstImage.info.width} x ${firstImage.info.height}`}
                  />
                  <Metric
                    label="Sorties"
                    value={`${selectedImages.length * 9} fichiers`}
                  />
                </div>
              ) : null}

              {selectedImages.length > 1 ? (
                <div className="grid max-h-40 grid-cols-2 gap-2 overflow-auto sm:grid-cols-3">
                  {selectedImages.map((image, index) => (
                    <div
                      className="flex min-w-0 items-center gap-2 rounded-md border border-stone-200 bg-stone-50 p-2"
                      key={image.id}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        alt=""
                        className="size-10 rounded-sm object-cover"
                        src={image.info.url}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-stone-900">
                          {index + 1}. {image.file.name}
                        </p>
                        <p className="font-mono text-xs text-stone-500">
                          {image.info.width} x {image.info.height}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

            </div>
          </div>
        </section>

        <aside className="flex flex-col gap-5 rounded-lg border border-black/10 bg-stone-950 p-4 text-white shadow-sm sm:p-5">
          <div>
            <h2 className="text-lg font-semibold">Sorties attendues</h2>
            <p className="mt-1 text-sm leading-6 text-stone-300">
              Ratio conserve, aucun crop, aucun upscale. En lot, les fichiers
              gardent le nom de base puis ajoutent -1, -2, -3.
            </p>
          </div>

          <div className="space-y-3">
            {expectedOutputs.map((preset) => (
              <div
                className="rounded-md border border-white/10 bg-white/[0.04] p-3"
                key={preset.label}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium capitalize">
                    {preset.label}
                  </span>
                  <span className="font-mono text-xs text-stone-300">
                    {preset.outputWidth}
                    {preset.outputHeight ? ` x ${preset.outputHeight}` : " px"}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {FORMAT_OUTPUTS.map((format) => (
                    <span
                      className="rounded-sm bg-white/10 px-2 py-1 font-mono text-xs text-stone-100"
                      key={format}
                    >
                      {folderName || "nom-image"}
                      {selectedImages.length > 1 ? "-1" : ""}-{preset.label}.
                      {format}
                    </span>
                  ))}
                </div>
                {preset.warning ? (
                  <p className="mt-3 text-xs leading-5 text-amber-200">
                    Au moins une source est plus petite que {preset.width}px.
                  </p>
                ) : null}
              </div>
            ))}
          </div>

          <div className="mt-auto rounded-md border border-emerald-400/30 bg-emerald-400/10 p-3">
            <h3 className="text-sm font-medium text-emerald-100">
              Arborescence ZIP
            </h3>
            <pre className="mt-2 overflow-x-auto font-mono text-xs leading-6 text-emerald-50">
              {`${folderName || "nom-image"}/
  avif/
    ${folderName || "nom-image"}${selectedImages.length > 1 ? "-1" : ""}-mobile.avif
  webp/
    ${folderName || "nom-image"}${selectedImages.length > 1 ? "-1" : ""}-mobile.webp
  jpeg/
    ${folderName || "nom-image"}${selectedImages.length > 1 ? "-1" : ""}-mobile.jpeg
  manifest.json`}
            </pre>
          </div>
        </aside>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-stone-200 bg-stone-50 p-3">
      <p className="text-xs text-stone-500">{label}</p>
      <p className="mt-1 truncate font-mono text-sm text-stone-950">{value}</p>
    </div>
  );
}
