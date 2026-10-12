import "server-only";

import { z } from "zod";

/**
 * Variables de entorno del panel. Solo se leen en el servidor:
 * ninguna lleva prefijo NEXT_PUBLIC_, asi que nunca llegan al navegador.
 */
const envSchema = z.object({
  SUPABASE_URL: z.url("SUPABASE_URL debe ser una URL valida (https://...)"),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(
      1,
      "SUPABASE_SERVICE_ROLE_KEY esta vacia: copiala desde Supabase > Project Settings > API",
    ),
  N8N_SCRAPER_WEBHOOK_URL: z.url(
    "N8N_SCRAPER_WEBHOOK_URL debe ser una URL valida (http://localhost:5678/webhook/...)",
  ),
});

export type Env = z.infer<typeof envSchema>;

/** Error de configuracion con un mensaje listo para mostrar en la UI. */
export class EnvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EnvError";
  }
}

let cached: Env | null = null;

/**
 * Devuelve las variables de entorno validadas.
 * Lanza `EnvError` con un mensaje claro en español si falta o es invalida alguna.
 */
export function getEnv(): Env {
  if (cached) return cached;

  const parsed = envSchema.safeParse({
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    N8N_SCRAPER_WEBHOOK_URL: process.env.N8N_SCRAPER_WEBHOOK_URL,
  });

  if (!parsed.success) {
    const detalle = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(raiz)"}: ${issue.message}`)
      .join("\n");

    throw new EnvError(
      `Configuracion de entorno incompleta. Revisa tu archivo .env.local (puedes partir de .env.example):\n${detalle}`,
    );
  }

  cached = parsed.data;
  return cached;
}

/** `true` si el entorno esta completo. Util para renderizar un aviso en vez de romper la pagina. */
export function isEnvReady(): boolean {
  try {
    getEnv();
    return true;
  } catch {
    return false;
  }
}

/** Mensaje de error de entorno, o `null` si todo esta configurado. */
export function getEnvError(): string | null {
  try {
    getEnv();
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "Error de configuracion desconocido";
  }
}
