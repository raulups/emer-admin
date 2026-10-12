"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { createBrand, updateBrand } from "@/app/brands/actions";
import { Button, buttonClasses } from "@/components/ui/Button";
import { ImageDropzone, type ImageDropzoneValue } from "@/components/ui/ImageDropzone";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { uploadBrandImage } from "@/lib/upload-client";
import { cn } from "@/lib/utils";
import {
  BRAND_TAG_DESCRIPTIONS,
  brandFormSchema,
  currentYear,
  MIN_FOUNDED_YEAR,
  toFieldErrors,
  type BrandFieldErrors,
  type BrandFormInput,
} from "@/lib/validation/brand";
import { BRAND_TAGS, type BrandTag, type Uuid } from "@/types/db";

export interface BrandFormProps {
  mode: "create" | "edit";
  /** Obligatorio en modo edicion. */
  brandId?: Uuid;
  initial: BrandFormInput;
}

const HEX6 = /^#[0-9A-Fa-f]{6}$/;
const HEX8 = /^#[0-9A-Fa-f]{8}$/;

/** Valor de 7 caracteres que necesita `<input type="color">`. */
function pickerValue(color: string): string {
  const value = color.trim();
  if (HEX6.test(value)) return value;
  if (HEX8.test(value)) return value.slice(0, 7);
  return "#000000";
}

export function BrandForm({ mode, brandId, initial }: BrandFormProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const [values, setValues] = useState<BrandFormInput>(initial);
  const [errors, setErrors] = useState<BrandFieldErrors>({});
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Las imagenes se eligen ahora y se suben al guardar.
  const [image, setImage] = useState<ImageDropzoneValue>({
    file: null,
    url: initial.img === "" ? null : initial.img,
  });
  const [logo, setLogo] = useState<ImageDropzoneValue>({
    file: null,
    url: initial.logo === "" ? null : initial.logo,
  });

  function setField<K extends keyof BrandFormInput>(key: K, value: BrandFormInput[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    // En cuanto el usuario toca un campo con error, se limpia su mensaje.
    setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current));
  }

  function toggleTag(tag: BrandTag) {
    setField(
      "tags",
      values.tags.includes(tag)
        ? values.tags.filter((item) => item !== tag)
        : [...values.tags, tag],
    );
  }

  /** Al cambiar el selector de color se conserva el alpha si lo habia. */
  function onPickColor(next: string) {
    const alpha = HEX8.test(values.color.trim()) ? values.color.trim().slice(7, 9) : "";
    setField("color", `${next.toUpperCase()}${alpha.toUpperCase()}`);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Se valida ANTES de subir nada: asi un error de formulario no deja
    // archivos huérfanos ni borra la imagen anterior para nada.
    const draft: BrandFormInput = {
      ...values,
      img: image.file ? "" : (image.url ?? ""),
      logo: logo.file ? "" : (logo.url ?? ""),
    };

    const parsed = brandFormSchema.safeParse(draft);
    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error));
      showToast("Revisa los campos marcados en rojo.", "error");
      return;
    }

    setPending(true);
    try {
      let imgUrl = image.url;
      let logoUrl = logo.url;

      if (image.file || logo.file) {
        setUploading(true);
        try {
          const [imageResult, logoResult] = await Promise.all([
            image.file
              ? uploadBrandImage({
                  file: image.file,
                  kind: "image",
                  brandName: values.name,
                  previousUrl: initial.img || null,
                })
              : null,
            logo.file
              ? uploadBrandImage({
                  file: logo.file,
                  kind: "logo",
                  brandName: values.name,
                  previousUrl: initial.logo || null,
                })
              : null,
          ]);

          if (imageResult && !imageResult.ok) {
            setErrors((current) => ({ ...current, img: imageResult.error }));
            showToast(`La imagen de portada no se ha podido subir: ${imageResult.error}`, "error");
            return;
          }

          if (logoResult && !logoResult.ok) {
            setErrors((current) => ({ ...current, logo: logoResult.error }));
            showToast(`El logo no se ha podido subir: ${logoResult.error}`, "error");
            return;
          }

          if (imageResult?.ok) imgUrl = imageResult.url;
          if (logoResult?.ok) logoUrl = logoResult.url;
        } finally {
          setUploading(false);
        }
      }

      const payload: BrandFormInput = { ...values, img: imgUrl ?? "", logo: logoUrl ?? "" };

      const result =
        mode === "create"
          ? await createBrand(payload)
          : await updateBrand(brandId as Uuid, payload);

      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        showToast(result.error, "error");
        return;
      }

      showToast(mode === "create" ? "Marca creada." : "Cambios guardados.", "ok");
      router.push(`/brands/${result.id}`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Error al guardar la marca.", "error");
    } finally {
      setPending(false);
    }
  }

  const cancelHref = mode === "edit" && brandId ? `/brands/${brandId}` : "/brands";

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        {/* Datos principales */}
        <div className="border-ink bg-paper shadow-hard flex flex-col gap-4 border-2 p-4">
          <h2 className="border-ink border-b-2 pb-2 text-sm tracking-wider">Datos de la marca</h2>

          <Input
            label="Nombre *"
            name="name"
            value={values.name}
            onChange={(event) => setField("name", event.target.value)}
            error={errors.name}
            placeholder="Nombre de la marca"
            autoComplete="off"
            required
          />

          <Input
            label="URL de la tienda *"
            name="url"
            value={values.url}
            onChange={(event) => setField("url", event.target.value)}
            error={errors.url}
            hint="Se guarda sin la barra final. El scraper le añade /products.json."
            placeholder="https://mimarca.com"
            inputMode="url"
            autoComplete="off"
            required
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Año de fundación"
              name="founded_year"
              value={values.founded_year}
              onChange={(event) => setField("founded_year", event.target.value)}
              error={errors.founded_year}
              hint={`Entre ${MIN_FOUNDED_YEAR} y ${currentYear()}`}
              type="number"
              min={MIN_FOUNDED_YEAR}
              max={currentYear()}
              step={1}
              placeholder="2019"
            />

            <Input
              label="Estilo"
              name="style"
              value={values.style}
              onChange={(event) => setField("style", event.target.value)}
              error={errors.style}
              hint="Texto libre: streetwear técnico, skate, workwear…"
              placeholder="Streetwear minimalista"
              autoComplete="off"
            />
          </div>

          {/* Color */}
          <div className="flex flex-col gap-1.5">
            <span className="label-caps">Color de marca</span>
            <div className="flex items-start gap-2">
              <input
                type="color"
                aria-label="Selector de color"
                value={pickerValue(values.color)}
                onChange={(event) => onPickColor(event.target.value)}
                className="border-ink bg-paper h-10 w-14 shrink-0 cursor-pointer border-2 p-0.5"
              />
              <Input
                name="color"
                value={values.color}
                onChange={(event) => setField("color", event.target.value)}
                error={errors.color}
                hint="#RRGGBB o #RRGGBBAA. Vacío = sin color."
                placeholder="#1F1F1F"
                autoComplete="off"
                wrapperClassName="flex-1"
                className="font-mono"
              />
              {values.color.trim() !== "" ? (
                <Button variant="secondary" size="sm" onClick={() => setField("color", "")}>
                  Vaciar
                </Button>
              ) : null}
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-col gap-2">
            <span className="label-caps">Tags</span>
            <div className="flex flex-col gap-1.5">
              {BRAND_TAGS.map((tag) => {
                const active = values.tags.includes(tag);
                return (
                  <div key={tag} className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggleTag(tag)}
                      aria-pressed={active}
                      className={cn(
                        "border-ink w-32 shrink-0 cursor-pointer border-2 px-2 py-1 text-[10px] font-bold tracking-widest uppercase transition-colors duration-[120ms]",
                        active ? "bg-ink text-cream" : "bg-paper hover:bg-cream",
                      )}
                    >
                      {tag}
                    </button>
                    <span className="text-ink/60 text-xs">{BRAND_TAG_DESCRIPTIONS[tag]}</span>
                  </div>
                );
              })}
            </div>
            {errors.tags ? <p className="text-error text-xs font-bold">{errors.tags}</p> : null}
          </div>
        </div>

        {/* Imagenes */}
        <div className="border-ink bg-paper shadow-hard flex flex-col gap-4 border-2 p-4">
          <h2 className="border-ink border-b-2 pb-2 text-sm tracking-wider">Imágenes</h2>

          <ImageDropzone
            label="Imagen de portada"
            value={image}
            onChange={setImage}
            error={errors.img}
            hint="Se recorta a 1920 px de ancho como máximo y se guarda en WEBP."
          />

          <ImageDropzone
            label="Logo"
            variant="logo"
            value={logo}
            onChange={setLogo}
            error={errors.logo}
            hint="Hasta 800 px. Se conserva la transparencia; los SVG se suben tal cual."
          />
        </div>
      </div>

      {/* Acciones */}
      <div className="border-ink bg-paper shadow-hard flex items-center justify-end gap-2 border-2 p-3">
        <Link href={cancelHref} className={buttonClasses("secondary", "md")}>
          Cancelar
        </Link>
        <Button type="submit" loading={pending}>
          {uploading ? "Subiendo imagen…" : mode === "create" ? "Crear marca" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
