"use client";

import { useState, useTransition, type FormEvent } from "react";

import { addOutreachMessage } from "@/app/outreach/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import {
  MESSAGE_DIRECTION_LABELS,
  OUTREACH_CHANNEL_LABELS,
  OUTREACH_STATUS_LABELS,
  messageFormSchema,
  toFieldErrors,
  type FieldErrors,
  type MessageFormInput,
} from "@/lib/validation/outreach";
import {
  MESSAGE_DIRECTIONS,
  OUTREACH_CHANNELS,
  type OutreachChannel,
  type OutreachStatus,
  type Uuid,
} from "@/types/db";

const DIRECTION_HINTS = {
  outbound: "Lo he enviado yo",
  inbound: "Respuesta de la marca",
} as const;

export interface MessageFormProps {
  brandId: Uuid;
  defaultChannel: OutreachChannel;
  currentStatus: OutreachStatus;
}

/** `datetime-local` (hora local, sin zona) -> ISO. Vacio se queda vacio (= ahora). */
function localToIso(value: string): string {
  if (value.trim() === "") return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

export function MessageForm({ brandId, defaultChannel, currentStatus }: MessageFormProps) {
  const { showToast } = useToast();
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useState<MessageFormInput>({
    channel: defaultChannel,
    direction: "outbound",
    body: "",
    sent_at: "",
  });
  const [errors, setErrors] = useState<FieldErrors<MessageFormInput>>({});

  function set<K extends keyof MessageFormInput>(key: K, value: MessageFormInput[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const payload: MessageFormInput = { ...values, sent_at: localToIso(values.sent_at) };
    const parsed = messageFormSchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(toFieldErrors<MessageFormInput>(parsed.error));
      return;
    }

    startTransition(async () => {
      const result = await addOutreachMessage(brandId, payload);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        showToast(result.error, "error");
        return;
      }
      setErrors({});
      setValues((current) => ({ ...current, body: "", sent_at: "" }));
      const statusChanged = result.status && result.status !== currentStatus;
      showToast(
        statusChanged
          ? `Mensaje guardado. Estado: ${OUTREACH_STATUS_LABELS[result.status!]}.`
          : "Mensaje guardado.",
        "ok",
      );
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Dirección">
        {MESSAGE_DIRECTIONS.map((direction) => {
          const selected = values.direction === direction;
          return (
            <button
              key={direction}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => set("direction", direction)}
              className={cn(
                "press border-ink flex cursor-pointer flex-col border-2 px-3 py-2 text-left",
                selected ? "bg-ink text-cream" : "bg-paper text-ink hover:bg-cream",
              )}
            >
              <span className="text-xs font-bold tracking-wide uppercase">
                {direction === "outbound" ? "→ " : "← "}
                {MESSAGE_DIRECTION_LABELS[direction]}
              </span>
              <span className="text-[11px] opacity-70">{DIRECTION_HINTS[direction]}</span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          name="channel"
          label="Canal"
          value={values.channel}
          onChange={(event) => set("channel", event.target.value as OutreachChannel)}
          options={OUTREACH_CHANNELS.map((channel) => ({
            value: channel,
            label: OUTREACH_CHANNEL_LABELS[channel],
          }))}
          error={errors.channel}
        />
        <Input
          name="sent_at"
          type="datetime-local"
          label="Fecha"
          value={values.sent_at}
          onChange={(event) => set("sent_at", event.target.value)}
          error={errors.sent_at}
          hint="Vacío = ahora"
        />
      </div>

      <Textarea
        name="body"
        label="Mensaje"
        placeholder={
          values.direction === "outbound"
            ? "Pega aquí el mensaje que has enviado…"
            : "Pega aquí lo que te han contestado…"
        }
        rows={5}
        value={values.body}
        onChange={(event) => set("body", event.target.value)}
        error={errors.body}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-ink/60 max-w-xs text-xs">
          El primer envío marca la petición como «Contactada» y una respuesta la pasa a «En
          conversación». El visto bueno o el rechazo los decides tú.
        </p>
        <Button type="submit" loading={pending}>
          {pending ? "Guardando…" : "Añadir mensaje"}
        </Button>
      </div>
    </form>
  );
}
