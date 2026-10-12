"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

/**
 * Visor de JSON hecho a mano: resaltado por tipo, nodos plegables, copiar y
 * descargar. Sin dependencias externas.
 */

type JsonValue = unknown;

function typeOf(value: JsonValue): "object" | "array" | "string" | "number" | "boolean" | "null" {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  const type = typeof value;
  if (type === "object") return "object";
  if (type === "number" || type === "bigint") return "number";
  if (type === "boolean") return "boolean";
  return "string";
}

/** Longitud a partir de la cual un string se corta con un "ver todo". */
const LONG_STRING = 300;

function StringValue({ value }: { value: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = value.length > LONG_STRING;
  const shown = isLong && !expanded ? `${value.slice(0, LONG_STRING)}…` : value;

  return (
    <span className="text-json-string break-all">
      &quot;{shown}&quot;
      {isLong ? (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="border-ink bg-cream text-ink ml-1.5 cursor-pointer border-2 px-1 text-[10px] font-bold uppercase"
        >
          {expanded ? "menos" : `+${value.length - LONG_STRING}`}
        </button>
      ) : null}
    </span>
  );
}

function Primitive({ value }: { value: JsonValue }) {
  switch (typeOf(value)) {
    case "string":
      return <StringValue value={String(value)} />;
    case "number":
      return <span className="text-json-number">{String(value)}</span>;
    case "boolean":
      return <span className="text-json-boolean font-bold">{String(value)}</span>;
    case "null":
      return <span className="text-json-null italic">null</span>;
    default:
      return <span>{String(value)}</span>;
  }
}

interface NodeProps {
  /** Clave o índice del que cuelga este valor. `null` en la raíz. */
  name: string | null;
  value: JsonValue;
  depth: number;
  /** Profundidad hasta la que los nodos arrancan abiertos. */
  openDepth: number;
  /** `true` si no es el último hermano (para pintar la coma). */
  comma: boolean;
}

function JsonNode({ name, value, depth, openDepth, comma }: NodeProps) {
  const kind = typeOf(value);
  const isBranch = kind === "object" || kind === "array";
  const [open, setOpen] = useState(depth < openDepth);

  const label =
    name === null ? null : <span className="text-json-key font-bold">&quot;{name}&quot;</span>;

  if (!isBranch) {
    return (
      <div className="pl-4">
        {label}
        {label ? <span className="text-ink/50">: </span> : null}
        <Primitive value={value} />
        {comma ? <span className="text-ink/40">,</span> : null}
      </div>
    );
  }

  const entries: Array<[string, JsonValue]> = Array.isArray(value)
    ? value.map((item, index) => [String(index), item])
    : Object.entries(value as Record<string, JsonValue>);

  const [openBrace, closeBrace] = Array.isArray(value) ? ["[", "]"] : ["{", "}"];
  const summary = Array.isArray(value)
    ? `${entries.length} ${entries.length === 1 ? "elemento" : "elementos"}`
    : `${entries.length} ${entries.length === 1 ? "clave" : "claves"}`;

  return (
    <div className={depth === 0 ? "" : "pl-4"}>
      <div className="flex items-start gap-1">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          className="border-ink bg-cream mt-0.5 shrink-0 cursor-pointer border-2 px-1 text-[10px] leading-none font-bold"
          aria-label={open ? "Plegar" : "Desplegar"}
        >
          {open ? "−" : "+"}
        </button>
        <div className="min-w-0 flex-1">
          {label}
          {label ? <span className="text-ink/50">: </span> : null}
          <span className="text-ink/60">{openBrace}</span>
          {!open ? (
            <>
              <span className="text-ink/40 mx-1 text-xs">… {summary}</span>
              <span className="text-ink/60">{closeBrace}</span>
              {comma ? <span className="text-ink/40">,</span> : null}
            </>
          ) : null}
        </div>
      </div>

      {open ? (
        <>
          <div className="border-ink/15 border-l-2 pl-1">
            {entries.length === 0 ? (
              <div className="text-ink/40 pl-4 text-xs">(vacío)</div>
            ) : (
              entries.map(([key, child], index) => (
                <JsonNode
                  key={key}
                  name={key}
                  value={child}
                  depth={depth + 1}
                  openDepth={openDepth}
                  comma={index < entries.length - 1}
                />
              ))
            )}
          </div>
          <div className={depth === 0 ? "" : "pl-4"}>
            <span className="text-ink/60">{closeBrace}</span>
            {comma ? <span className="text-ink/40">,</span> : null}
          </div>
        </>
      ) : null}
    </div>
  );
}

export interface JsonViewerProps {
  value: unknown;
  /** Nombre del archivo que se descarga, sin extensión. */
  filename: string;
  /** Profundidad abierta por defecto. */
  defaultDepth?: number;
  /** Texto informativo que se muestra en la barra de acciones. */
  note?: string;
}

export function JsonViewer({ value, filename, defaultDepth = 2, note }: JsonViewerProps) {
  const { showToast } = useToast();
  const [openDepth, setOpenDepth] = useState(defaultDepth);
  // Al cambiar la profundidad hay que remontar los nodos para que recalculen
  // su estado inicial: por eso la `generation` va en la `key`.
  const [generation, setGeneration] = useState(0);

  const text = JSON.stringify(value, null, 2);
  const sizeKb = Math.max(Math.round((text.length / 1024) * 10) / 10, 0.1);

  function setDepth(depth: number) {
    setOpenDepth(depth);
    setGeneration((current) => current + 1);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      showToast("JSON copiado al portapapeles.", "ok");
    } catch {
      showToast("El navegador no ha permitido copiar al portapapeles.", "error");
    }
  }

  function download() {
    try {
      const blob = new Blob([text], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${filename}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      showToast("No se ha podido generar el archivo.", "error");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="border-ink bg-cream flex flex-wrap items-center justify-between gap-2 border-2 p-2">
        <p className="text-ink/60 text-xs">
          {note ? `${note} · ` : ""}
          {sizeKb} KB
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setDepth(99)}>
            Expandir todo
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setDepth(0)}>
            Plegar todo
          </Button>
          <Button variant="secondary" size="sm" onClick={copy}>
            Copiar
          </Button>
          <Button size="sm" onClick={download}>
            Descargar .json
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "border-ink bg-paper max-h-[70vh] overflow-auto border-2 p-3",
          "font-mono text-xs leading-relaxed",
        )}
      >
        <JsonNode
          key={generation}
          name={null}
          value={value}
          depth={0}
          openDepth={openDepth}
          comma={false}
        />
      </div>
    </div>
  );
}
