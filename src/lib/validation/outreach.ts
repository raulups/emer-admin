import { z } from "zod";

import {
  MESSAGE_DIRECTIONS,
  OUTREACH_CHANNELS,
  OUTREACH_STATUSES,
  type BrandOutreach,
  type MessageDirection,
  type OutreachChannel,
  type OutreachStatus,
} from "@/types/db";

/**
 * Esquemas y etiquetas de la seccion Contacto. Se usan tal cual en el cliente
 * (validacion instantanea) y en las Server Actions.
 */

export const OUTREACH_STATUS_LABELS: Record<OutreachStatus, string> = {
  pending: "Sin contactar",
  contacted: "Contactada",
  in_conversation: "En conversación",
  approved: "Visto bueno",
  rejected: "Rechazada",
  no_response: "Sin respuesta",
};

export const OUTREACH_STATUS_DESCRIPTIONS: Record<OutreachStatus, string> = {
  pending: "Todavía no le hemos escrito",
  contacted: "Mensaje enviado, esperando respuesta",
  in_conversation: "Ha contestado, seguimos hablando",
  approved: "Ha dado permiso para aparecer en Emer",
  rejected: "No quiere aparecer en Emer",
  no_response: "No contesta tras varios intentos",
};

export const OUTREACH_CHANNEL_LABELS: Record<OutreachChannel, string> = {
  instagram: "Instagram",
  email: "Correo",
  whatsapp: "WhatsApp",
  phone: "Teléfono",
  web_form: "Formulario web",
  in_person: "En persona",
  other: "Otro",
};

export const MESSAGE_DIRECTION_LABELS: Record<MessageDirection, string> = {
  outbound: "Enviado",
  inbound: "Recibido",
};

/** Estados en los que la peticion ya esta resuelta. */
export const FINAL_OUTREACH_STATUSES: readonly OutreachStatus[] = ["approved", "rejected"];

export function isFinalStatus(status: OutreachStatus): boolean {
  return FINAL_OUTREACH_STATUSES.includes(status);
}

/** Fecha local de hoy como `YYYY-MM-DD` (mismo formato que la columna `date`). */
export function todayIsoDate(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isFollowUpDue(
  outreach: Pick<BrandOutreach, "status" | "follow_up_at"> | null,
  today: string,
): boolean {
  if (!outreach?.follow_up_at || isFinalStatus(outreach.status)) return false;
  return outreach.follow_up_at <= today;
}

/**
 * Estado al que se pasa automaticamente al registrar un mensaje.
 * Nunca toca una peticion ya resuelta (visto bueno o rechazo).
 */
export function nextStatusAfterMessage(
  current: OutreachStatus,
  direction: MessageDirection,
): OutreachStatus {
  if (isFinalStatus(current)) return current;
  if (direction === "inbound") return "in_conversation";
  if (current === "pending") return "contacted";
  return current;
}

/** Acepta `@usuario`, `usuario` o la URL del perfil; devuelve el usuario sin `@`. */
export function normalizeInstagram(value: string): string | null {
  let handle = value.trim();
  if (handle === "") return null;
  const fromUrl = handle.match(/instagram\.com\/([^/?#\s]+)/i);
  if (fromUrl?.[1]) handle = fromUrl[1];
  return handle.replace(/^@+/, "").toLowerCase();
}

const INSTAGRAM_HANDLE = /^[a-z0-9._]{1,30}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres`)
    .transform((value) => (value === "" ? null : value));

export const outreachFormSchema = z.object({
  status: z.enum(OUTREACH_STATUSES, { error: "Elige un estado" }),
  contact_name: optionalText(120),
  instagram: z
    .string()
    .transform(normalizeInstagram)
    .refine(
      (value) => value === null || INSTAGRAM_HANDLE.test(value),
      "Usuario de Instagram no válido",
    ),
  email: z
    .string()
    .trim()
    .transform((value) => (value === "" ? null : value.toLowerCase()))
    .refine((value) => value === null || EMAIL.test(value), "Correo no válido"),
  follow_up_at: z
    .string()
    .trim()
    .transform((value) => (value === "" ? null : value))
    .refine((value) => value === null || ISO_DATE.test(value), "Fecha no válida"),
  notes: optionalText(5000),
});

export type OutreachFormInput = {
  status: OutreachStatus;
  contact_name: string;
  instagram: string;
  email: string;
  follow_up_at: string;
  notes: string;
};

export type OutreachFormValues = z.output<typeof outreachFormSchema>;

export const messageFormSchema = z.object({
  channel: z.enum(OUTREACH_CHANNELS, { error: "Elige un canal" }),
  direction: z.enum(MESSAGE_DIRECTIONS, { error: "Elige si lo enviaste o lo recibiste" }),
  body: z
    .string()
    .trim()
    .min(1, "Escribe o pega el mensaje")
    .max(10000, "Máximo 10.000 caracteres"),
  /** ISO 8601. Vacio = ahora. */
  sent_at: z
    .string()
    .trim()
    .transform((value) => (value === "" ? null : value))
    .refine((value) => value === null || !Number.isNaN(Date.parse(value)), "Fecha no válida"),
});

export type MessageFormInput = {
  channel: OutreachChannel;
  direction: MessageDirection;
  body: string;
  sent_at: string;
};

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

/** Convierte los issues de zod en un mapa `campo -> primer mensaje`. */
export function toFieldErrors<T>(error: {
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>;
}): FieldErrors<T> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !(key in result)) result[key] = issue.message;
  }
  return result as FieldErrors<T>;
}

export function outreachToFormInput(outreach: BrandOutreach | null): OutreachFormInput {
  return {
    status: outreach?.status ?? "pending",
    contact_name: outreach?.contact_name ?? "",
    instagram: outreach?.instagram ?? "",
    email: outreach?.email ?? "",
    follow_up_at: outreach?.follow_up_at ?? "",
    notes: outreach?.notes ?? "",
  };
}
