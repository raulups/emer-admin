"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

/**
 * Zona de arrastrar y soltar para una imagen.
 *
 * NO sube nada: solo elige el archivo y enseña la vista previa en local. La
 * subida la hace el formulario al guardar, contra /api/brands/upload.
 */

const ACCEPTED: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/svg+xml": "svg",
};

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_MB = 10;

/** Cuadrícula tipo tablero para ver las transparencias de los logos. */
const CHECKERBOARD = {
  backgroundImage:
    "linear-gradient(45deg, #d8d2c6 25%, transparent 25%), linear-gradient(-45deg, #d8d2c6 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #d8d2c6 75%), linear-gradient(-45deg, transparent 75%, #d8d2c6 75%)",
  backgroundSize: "16px 16px",
  backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
  backgroundColor: "#ffffff",
} as const;

export interface ImageDropzoneValue {
  /** Archivo recién elegido, pendiente de subir. */
  file: File | null;
  /** URL ya guardada o pegada a mano. `null` = sin imagen. */
  url: string | null;
}

export interface ImageDropzoneProps {
  label: string;
  value: ImageDropzoneValue;
  onChange: (value: ImageDropzoneValue) => void;
  /** `logo` pinta la vista previa sobre cuadrícula y con `contain`. */
  variant?: "image" | "logo";
  hint?: string;
  /** Error que viene de fuera (por ejemplo, de la subida al guardar). */
  error?: string | null;
}

function formatKb(bytes: number): string {
  return `${new Intl.NumberFormat("es-ES").format(Math.round(bytes / 1024))} KB`;
}

export function ImageDropzone({
  label,
  value,
  onChange,
  variant = "image",
  hint,
  error,
}: ImageDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [pasting, setPasting] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");

  // Vista previa local inmediata, sin pasar por el servidor.
  const previewUrl = useMemo(
    () => (value.file ? URL.createObjectURL(value.file) : null),
    [value.file],
  );

  // La URL de objeto se libera al cambiar de archivo o al desmontar.
  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function accept(file: File | undefined | null) {
    if (!file) return;

    if (!ACCEPTED[file.type]) {
      setLocalError(
        `Formato no admitido (${file.type || "desconocido"}). Usa PNG, JPG, WEBP, AVIF o SVG.`,
      );
      return;
    }

    if (file.size > MAX_BYTES) {
      setLocalError(
        `La imagen pesa ${(file.size / 1024 / 1024).toFixed(1)} MB y el máximo son ${MAX_MB} MB.`,
      );
      return;
    }

    setLocalError(null);
    onChange({ file, url: value.url });
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    accept(event.dataTransfer.files?.[0]);
  }

  function clear() {
    setLocalError(null);
    if (inputRef.current) inputRef.current.value = "";
    onChange({ file: null, url: null });
  }

  function applyUrl() {
    const trimmed = urlDraft.trim();
    if (trimmed === "") {
      setPasting(false);
      return;
    }

    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error();
    } catch {
      setLocalError("Esa URL no es válida (debe empezar por https://).");
      return;
    }

    setLocalError(null);
    onChange({ file: null, url: trimmed });
    setPasting(false);
    setUrlDraft("");
  }

  // Lo que se ve: el archivo nuevo manda sobre la URL guardada.
  const shown = previewUrl ?? value.url;
  const isLogo = variant === "logo";
  const shownError = localError ?? error ?? null;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="label-caps">{label}</span>

      <input
        ref={inputRef}
        type="file"
        accept={Object.keys(ACCEPTED).join(",")}
        className="hidden"
        onChange={(event) => accept(event.target.files?.[0])}
      />

      {shown ? (
        <div className="border-ink bg-paper flex flex-col gap-2 border-2 p-2">
          <div
            className={cn("flex items-center justify-center", isLogo ? "h-32" : "h-40")}
            style={isLogo ? CHECKERBOARD : { backgroundColor: "var(--color-cream)" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={shown}
              alt={`Vista previa de ${label.toLowerCase()}`}
              className="max-h-full max-w-full object-contain"
              onError={() => setLocalError("No se ha podido cargar la imagen.")}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-ink/60 text-[11px]">
              {value.file ? (
                <>
                  <span className="font-bold">{value.file.name}</span> · {formatKb(value.file.size)}{" "}
                  · se subirá al guardar
                </>
              ) : (
                "Imagen guardada"
              )}
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
                Cambiar
              </Button>
              <Button variant="danger" size="sm" onClick={clear}>
                Quitar
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-1 border-2 border-dashed p-6 text-center transition-colors duration-[120ms]",
            isLogo ? "h-32" : "h-40",
            dragging ? "border-ink bg-ink text-cream" : "border-ink bg-paper text-ink",
          )}
        >
          <span className="text-xs font-bold tracking-widest uppercase">
            Arrastra la imagen o haz click
          </span>
          <span className={cn("text-[11px]", dragging ? "text-cream/70" : "text-ink/50")}>
            PNG, JPG, WEBP, AVIF o SVG · hasta {MAX_MB} MB
          </span>
        </div>
      )}

      {/* Alternativa para imágenes que ya viven en Cloudinary u otro sitio */}
      {pasting ? (
        <div className="flex items-center gap-2">
          <input
            value={urlDraft}
            onChange={(event) => setUrlDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                applyUrl();
              }
            }}
            placeholder="https://res.cloudinary.com/…"
            autoComplete="off"
            className="border-ink bg-paper min-w-0 flex-1 border-2 px-2 py-1 text-xs"
          />
          <Button variant="secondary" size="sm" onClick={applyUrl}>
            Usar
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setPasting(false)}>
            Cancelar
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setUrlDraft(value.url ?? "");
            setPasting(true);
          }}
          className="text-ink/50 hover:text-ink self-start text-[11px] underline"
        >
          Pegar URL
        </button>
      )}

      {shownError ? <p className="text-error text-xs font-bold">{shownError}</p> : null}
      {!shownError && hint ? <p className="text-ink/60 text-xs">{hint}</p> : null}
    </div>
  );
}
