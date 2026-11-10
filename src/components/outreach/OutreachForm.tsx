"use client";

import { useState, useTransition, type FormEvent } from "react";

import { saveOutreach } from "@/app/outreach/actions";
import { OUTREACH_STATUS_TONES } from "@/components/outreach/OutreachStatusBadge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import {
  OUTREACH_STATUS_DESCRIPTIONS,
  OUTREACH_STATUS_LABELS,
  outreachFormSchema,
  toFieldErrors,
  type FieldErrors,
  type OutreachFormInput,
} from "@/lib/validation/outreach";
import { OUTREACH_STATUSES, type OutreachStatus, type Uuid } from "@/types/db";

const SELECTED_TONES: Record<string, string> = {
  muted: "bg-ink text-cream",
  neutral: "bg-ink text-cream",
  progress: "bg-progress text-ink",
  ok: "bg-ok text-paper",
  error: "bg-error text-paper",
};

export interface OutreachFormProps {
  brandId: Uuid;
  initial: OutreachFormInput;
}

export function OutreachForm({ brandId, initial }: OutreachFormProps) {
  const { showToast } = useToast();
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useState<OutreachFormInput>(initial);
  const [saved, setSaved] = useState<OutreachFormInput>(initial);
  const [errors, setErrors] = useState<FieldErrors<OutreachFormInput>>({});

  // Si el estado cambia desde fuera (p. ej. al registrar un mensaje) y no hay
  // cambios locales, el formulario se pone al dia.
  const [lastInitial, setLastInitial] = useState(initial);
  if (initial !== lastInitial) {
    setLastInitial(initial);
    if (JSON.stringify(values) === JSON.stringify(saved)) setValues(initial);
    setSaved(initial);
  }

  const dirty = JSON.stringify(values) !== JSON.stringify(saved);

  function set<K extends keyof OutreachFormInput>(key: K, value: OutreachFormInput[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = outreachFormSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(toFieldErrors<OutreachFormInput>(parsed.error));
      showToast("Revisa los campos marcados en rojo.", "error");
      return;
    }

    // Lo que guardara el servidor (instagram sin @, correo en minusculas...).
    const normalized: OutreachFormInput = {
      status: parsed.data.status,
      contact_name: parsed.data.contact_name ?? "",
      instagram: parsed.data.instagram ?? "",
      email: parsed.data.email ?? "",
      follow_up_at: parsed.data.follow_up_at ?? "",
      notes: parsed.data.notes ?? "",
    };

    startTransition(async () => {
      const result = await saveOutreach(brandId, values);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        showToast(result.error, "error");
        return;
      }
      setErrors({});
      setValues(normalized);
      setSaved(normalized);
      showToast("Estado guardado.", "ok");
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="label-caps mb-1.5">Estado de la petición</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup">
          {OUTREACH_STATUSES.map((status: OutreachStatus) => {
            const selected = values.status === status;
            return (
              <button
                key={status}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => set("status", status)}
                title={OUTREACH_STATUS_DESCRIPTIONS[status]}
                className={cn(
                  "press border-ink cursor-pointer border-2 px-2 py-2 text-left text-xs font-bold tracking-wide uppercase",
                  selected
                    ? SELECTED_TONES[OUTREACH_STATUS_TONES[status]]
                    : "bg-paper text-ink hover:bg-cream",
                )}
              >
                {OUTREACH_STATUS_LABELS[status]}
              </button>
            );
          })}
        </div>
        <p className="text-ink/60 text-xs">{OUTREACH_STATUS_DESCRIPTIONS[values.status]}</p>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          name="instagram"
          label="Instagram"
          placeholder="@mimarca"
          value={values.instagram}
          onChange={(event) => set("instagram", event.target.value)}
          error={errors.instagram}
          hint="Usuario o enlace al perfil"
          autoComplete="off"
        />
        <Input
          name="email"
          type="email"
          label="Correo"
          placeholder="hola@mimarca.com"
          value={values.email}
          onChange={(event) => set("email", event.target.value)}
          error={errors.email}
          autoComplete="off"
        />
        <Input
          name="contact_name"
          label="Persona de contacto"
          placeholder="Nombre de quien responde"
          value={values.contact_name}
          onChange={(event) => set("contact_name", event.target.value)}
          error={errors.contact_name}
          autoComplete="off"
        />
        <Input
          name="follow_up_at"
          type="date"
          label="Próximo seguimiento"
          value={values.follow_up_at}
          onChange={(event) => set("follow_up_at", event.target.value)}
          error={errors.follow_up_at}
          hint="Cuándo volver a escribir si no contestan"
        />
      </div>

      <Textarea
        name="notes"
        label="Notas"
        placeholder="Condiciones que piden, a quién hay que escribir, ideas…"
        rows={5}
        value={values.notes}
        onChange={(event) => set("notes", event.target.value)}
        error={errors.notes}
      />

      <div className="flex flex-wrap items-center justify-end gap-3">
        {dirty ? <span className="text-ink/60 text-xs">Cambios sin guardar</span> : null}
        <Button type="submit" loading={pending} disabled={pending || !dirty}>
          {pending ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </form>
  );
}
