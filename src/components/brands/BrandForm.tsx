"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

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
  /** `modal`: version compacta para el pop-up de edicion rapida. */
  variant?: "page" | "modal";
  /** Si se pasa, se llama al guardar en lugar de navegar al detalle. */
  onSaved?: (id: Uuid) => void;
  /** Si se pasa, el boton Cancelar lo llama en lugar de ser un enlace. */
  onCancel?: () => void;
  /** Avisa cuando hay cambios sin guardar. */
  onDirtyChange?: (dirty: boolean) => void;
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

function sameInput(a: BrandFormInput, b: BrandFormInput): boolean {
  return (
    a.name === b.name &&
    a.url === b.url &&
    a.color === b.color &&
    a.founded_year === b.founded_year &&
    a.style === b.style &&
    a.tags.length === b.tags.length &&
    a.tags.every((tag) => b.tags.includes(tag))
  );
}

export function BrandForm({
  mode,
  brandId,
  initial,
  variant = "page",
  onSaved,
  onCancel,
  onDirtyChange,
}: BrandFormProps) {
  const isModal = variant === "modal";
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const { showToast } = useToast();

  const [values, setValues] = useState<BrandFormInput>(initial);
  const [errors, setErrors] = useState<BrandFieldErrors>({});
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Las imagenes se eligen ahora y se suben al guardar.
  const [desktop, setDesktop] = useState<ImageDropzoneValue>({
    file: null,
    url: initial.img_desktop === "" ? null : initial.img_desktop,
  });
  const [mobile, setMobile] = useState<ImageDropzoneValue>({
    file: null,
    url: initial.img_mobile === "" ? null : initial.img_mobile,
  });
  const [logo, setLogo] = useState<ImageDropzoneValue>({
    file: null,
    url: initial.logo === "" ? null : initial.logo,
  });

  const dirty =
    !sameInput(values, initial) ||
    desktop.file !== null ||
    mobile.file !== null ||
    logo.file !== null ||
    (desktop.url ?? "") !== initial.img_desktop ||
    (mobile.url ?? "") !== initial.img_mobile ||
    (logo.url ?? "") !== initial.logo;

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  function onKeyDown(event: React.KeyboardEvent<HTMLFormElement>) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      formRef.current?.requestSubmit();
    }
  }

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
      img_desktop: desktop.file ? "" : (desktop.url ?? ""),
      img_mobile: mobile.file ? "" : (mobile.url ?? ""),
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
      let desktopUrl = desktop.url;
      let mobileUrl = mobile.url;
      let logoUrl = logo.url;

      if (desktop.file || mobile.file || logo.file) {
        setUploading(true);
        try {
          const [desktopResult, mobileResult, logoResult] = await Promise.all([
            desktop.file
              ? uploadBrandImage({
                  file: desktop.file,
                  kind: "desktop",
                  brandName: values.name,
                  previousUrl: initial.img_desktop || null,
                })
              : null,
            mobile.file
              ? uploadBrandImage({
                  file: mobile.file,
                  kind: "mobile",
                  brandName: values.name,
                  previousUrl: initial.img_mobile || null,
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

          if (desktopResult && !desktopResult.ok) {
            setErrors((current) => ({ ...current, img_desktop: desktopResult.error }));
            showToast(
              `La imagen de desktop no se ha podido subir: ${desktopResult.error}`,
              "error",
            );
            return;
          }

          if (mobileResult && !mobileResult.ok) {
            setErrors((current) => ({ ...current, img_mobile: mobileResult.error }));
            showToast(`La imagen de app no se ha podido subir: ${mobileResult.error}`, "error");
            return;
          }

          if (logoResult && !logoResult.ok) {
            setErrors((current) => ({ ...current, logo: logoResult.error }));
            showToast(`El logo no se ha podido subir: ${logoResult.error}`, "error");
            return;
          }

          if (desktopResult?.ok) desktopUrl = desktopResult.url;
          if (mobileResult?.ok) mobileUrl = mobileResult.url;
          if (logoResult?.ok) logoUrl = logoResult.url;
        } finally {
          setUploading(false);
        }
      }

      const payload: BrandFormInput = {
        ...values,
        img_desktop: desktopUrl ?? "",
        img_mobile: mobileUrl ?? "",
        logo: logoUrl ?? "",
      };

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
      onDirtyChange?.(false);
      if (onSaved) onSaved(result.id);
      else router.push(`/brands/${result.id}`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Error al guardar la marca.", "error");
    } finally {
      setPending(false);
    }
  }

  const cancelHref = mode === "edit" && brandId ? `/brands/${brandId}` : "/brands";
  const panel = isModal
    ? "flex flex-col gap-4"
    : "border-line bg-paper shadow-sm flex flex-col gap-4 border p-4";
  const submitLabel = uploading
    ? "Subiendo imagen…"
    : mode === "create"
      ? "Crear marca"
      : "Guardar cambios";

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      onKeyDown={onKeyDown}
      className="flex flex-col gap-4"
      noValidate
    >
      <div
        className={cn(
          "grid gap-4",
          isModal ? "lg:grid-cols-[3fr_2fr] lg:gap-6" : "lg:grid-cols-[2fr_1fr]",
        )}
      >
        <div className={panel}>
          <h2 className="border-line border-b pb-2 text-sm">Datos de la marca</h2>

          <div className={cn("grid gap-4", isModal && "sm:grid-cols-2")}>
            <Input
              label="Nombre *"
              name="name"
              value={values.name}
              onChange={(event) => setField("name", event.target.value)}
              error={errors.name}
              placeholder="Nombre de la marca"
              autoComplete="off"
              autoFocus={isModal}
              required
            />

            <Input
              label="URL de la tienda *"
              name="url"
              value={values.url}
              onChange={(event) => setField("url", event.target.value)}
              error={errors.url}
              hint={
                isModal
                  ? undefined
                  : "Se guarda sin la barra final. El scraper le añade /products.json."
              }
              placeholder="https://mimarca.com"
              inputMode="url"
              autoComplete="off"
              required
            />
          </div>

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

          <div className="flex flex-col gap-1.5">
            <span className="label-caps">Color de marca</span>
            <div className="flex items-start gap-2">
              <input
                type="color"
                aria-label="Selector de color"
                value={pickerValue(values.color)}
                onChange={(event) => onPickColor(event.target.value)}
                className="border-line bg-paper h-10 w-14 shrink-0 cursor-pointer border p-0.5"
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

          <div className="flex flex-col gap-2">
            <span className="label-caps">Tags</span>
            {isModal ? (
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {BRAND_TAGS.map((tag) => {
                  const active = values.tags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      aria-pressed={active}
                      title={BRAND_TAG_DESCRIPTIONS[tag]}
                      className={cn(
                        "flex cursor-pointer flex-col items-start gap-0.5 border px-2.5 py-2 text-left transition-colors duration-150",
                        active
                          ? "border-accent/50 bg-accent-soft"
                          : "border-line bg-paper hover:border-line-strong",
                      )}
                    >
                      <span className={cn("text-xs font-medium", active && "text-accent")}>
                        {active ? "✓ " : ""}
                        {tag}
                      </span>
                      <span
                        className={cn(
                          "line-clamp-1 text-[11px]",
                          active ? "text-accent/70" : "text-ink/50",
                        )}
                      >
                        {BRAND_TAG_DESCRIPTIONS[tag]}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
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
                          "w-32 shrink-0 cursor-pointer rounded-full border px-2.5 py-1 text-xs font-medium transition-colors duration-150",
                          active
                            ? "border-accent/40 bg-accent-soft text-accent"
                            : "border-line bg-paper hover:border-line-strong",
                        )}
                      >
                        {tag}
                      </button>
                      <span className="text-ink/60 text-xs">{BRAND_TAG_DESCRIPTIONS[tag]}</span>
                    </div>
                  );
                })}
              </div>
            )}
            {errors.tags ? <p className="text-error text-xs font-semibold">{errors.tags}</p> : null}
          </div>
        </div>

        <div className={panel}>
          <h2 className="border-line border-b pb-2 text-sm">Imágenes</h2>

          <ImageDropzone
            label="Desktop · horizontal"
            aspect="16/9"
            value={desktop}
            onChange={setDesktop}
            error={errors.img_desktop}
            hint="Proporción 16/9. Hasta 1920 px de ancho; se guarda en WEBP."
          />

          <div className={cn("flex flex-col gap-4", isModal && "grid grid-cols-2 items-start")}>
            <ImageDropzone
              label="App · vertical"
              aspect="9/16"
              value={mobile}
              onChange={setMobile}
              error={errors.img_mobile}
              hint={
                isModal
                  ? "9/16 · WEBP"
                  : "Proporción 9/16. Hasta 1080 px de ancho; se guarda en WEBP."
              }
            />

            <ImageDropzone
              label="Logo"
              variant="logo"
              value={logo}
              onChange={setLogo}
              error={errors.logo}
              hint={
                isModal
                  ? "Hasta 800 px"
                  : "Hasta 800 px. Se conserva la transparencia; los SVG se suben tal cual."
              }
            />
          </div>
        </div>
      </div>

      <div
        className={cn(
          "border-line bg-paper flex items-center justify-end gap-2",
          isModal
            ? "bg-paper/95 sticky -bottom-5 -mx-5 -mb-5 border-t px-5 py-3 backdrop-blur"
            : "border p-3 shadow-sm",
        )}
      >
        <span className="text-ink/50 mr-auto hidden text-[11px] sm:inline">
          {dirty ? "Cambios sin guardar · " : ""}Ctrl/⌘ + Enter para guardar
        </span>
        {onCancel ? (
          <Button variant="secondary" onClick={onCancel} disabled={pending}>
            Cancelar
          </Button>
        ) : (
          <Link href={cancelHref} className={buttonClasses("secondary", "md")}>
            Cancelar
          </Link>
        )}
        <Button type="submit" loading={pending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
