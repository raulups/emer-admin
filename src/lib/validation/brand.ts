import { z } from "zod";

import { isHttpUrl, normalizeUrl } from "@/lib/url";
import { BRAND_TAGS, type BrandTag } from "@/types/db";

/**
 * Esquema del formulario de marca. Se usa TAL CUAL en el cliente (validacion
 * instantanea) y en la Server Action (validacion real antes de escribir).
 *
 * La entrada son siempre strings, como los que produce un `<input>`; la salida
 * ya trae los tipos y los `null` que espera la tabla `brands`.
 */

export const MIN_FOUNDED_YEAR = 1900;
/** Se calcula en cada validacion para que no se quede obsoleto. */
export const currentYear = () => new Date().getFullYear();

/** Descripcion de cada tag del enum `brand_tag`, para mostrarla junto al chip. */
export const BRAND_TAG_DESCRIPTIONS: Record<BrandTag, string> = {
  popular: "Marcas consolidadas con tirón",
  emergente: "Marcas pequeñas en crecimiento",
  novedad: "Recién añadida a Emer",
  destacada: "Aparece en el hero/carrusel principal",
  sostenible: "Producción local, materiales reciclados o tiradas cortas",
  drops: "Vende por lanzamientos limitados",
};

const HEX_COLOR = /^#(?:[0-9A-F]{6}|[0-9A-F]{8})$/;

const requiredUrlField = z
  .string()
  .trim()
  .min(1, "La URL de la tienda es obligatoria")
  .transform(normalizeUrl)
  .refine(isHttpUrl, "Debe ser una URL válida, por ejemplo https://mimarca.com");

const optionalUrlField = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : normalizeUrl(value)))
  .refine((value) => value === null || isHttpUrl(value), "Debe ser una URL válida (https://…)");

const optionalColorField = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : value.toUpperCase()))
  .refine((value) => value === null || HEX_COLOR.test(value), "Usa el formato #RRGGBB o #RRGGBBAA");

const optionalYearField = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : Number(value)))
  .refine(
    (value) =>
      value === null ||
      (Number.isInteger(value) && value >= MIN_FOUNDED_YEAR && value <= currentYear()),
    `El año debe estar entre ${MIN_FOUNDED_YEAR} y ${currentYear()}`,
  );

const optionalTextField = z
  .string()
  .trim()
  .max(200, "Máximo 200 caracteres")
  .transform((value) => (value === "" ? null : value));

export const brandFormSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(120, "Máximo 120 caracteres"),
  url: requiredUrlField,
  img: optionalUrlField,
  logo: optionalUrlField,
  color: optionalColorField,
  founded_year: optionalYearField,
  style: optionalTextField,
  tags: z.array(z.enum(BRAND_TAGS)).max(BRAND_TAGS.length),
});

/** Lo que escribe el usuario (todo texto). */
export type BrandFormInput = {
  name: string;
  url: string;
  img: string;
  logo: string;
  color: string;
  founded_year: string;
  style: string;
  tags: BrandTag[];
};

/** Lo que se guarda en la tabla `brands`. */
export type BrandFormValues = z.output<typeof brandFormSchema>;

/** Errores por campo, tal y como los consumen los componentes del formulario. */
export type BrandFieldErrors = Partial<Record<keyof BrandFormInput, string>>;

/**
 * Convierte los issues de zod en un mapa `campo -> primer mensaje`.
 * El parametro es estructural (no `ZodError<T>`) para que valga igual con el
 * error del esquema de entrada y con el de salida.
 */
export function toFieldErrors(error: {
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>;
}): BrandFieldErrors {
  const result: BrandFieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !(key in result)) {
      result[key as keyof BrandFormInput] = issue.message;
    }
  }
  return result;
}

export const EMPTY_BRAND_FORM: BrandFormInput = {
  name: "",
  url: "",
  img: "",
  logo: "",
  color: "",
  founded_year: "",
  style: "",
  tags: [],
};
