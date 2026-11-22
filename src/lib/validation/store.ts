import { z } from "zod";

/** Origen de una tienda: a mano o elegida en el buscador. */
export const STORE_SOURCES = ["manual", "google", "osm"] as const;
export type StoreSource = (typeof STORE_SOURCES)[number];

export const STORE_SOURCE_LABELS: Record<string, string> = {
  manual: "Manual",
  google: "Google",
  osm: "OpenStreetMap",
};

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres.`)
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .optional()
    .transform((value) => value ?? null);

const coordinate = (label: string, limit: number) =>
  z.coerce
    .number({ error: `${label} no es un número.` })
    .refine(Number.isFinite, `${label} no es un número.`)
    .refine((value) => Math.abs(value) <= limit, `${label} debe estar entre -${limit} y ${limit}.`);

/** Formulario de tienda (el mismo en el cliente y en la Server Action). */
export const storeFormSchema = z
  .object({
    brandId: z.uuid("Elige una marca."),
    name: optionalText(120),
    address: z.string().trim().min(1, "La dirección es obligatoria.").max(200),
    city: z.string().trim().min(1, "La ciudad es obligatoria.").max(80),
    country: optionalText(80),
    latitude: coordinate("La latitud", 90),
    longitude: coordinate("La longitud", 180),
    placeId: optionalText(300).refine(
      (value) => value === null || /^[A-Za-z0-9_-]+$/.test(value),
      "El place_id solo lleva letras, números, - y _.",
    ),
    isActive: z.boolean().default(true),
    source: z.enum(STORE_SOURCES).default("manual"),
  })
  .refine((value) => !(value.latitude === 0 && value.longitude === 0), {
    message: "Faltan las coordenadas.",
    path: ["latitude"],
  });

export type StoreFormInput = z.input<typeof storeFormSchema>;
export type StoreFormValues = z.output<typeof storeFormSchema>;
