"use client";

import { useState, useTransition } from "react";

import { setOutreachStatus } from "@/app/outreach/actions";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { OUTREACH_STATUS_LABELS } from "@/lib/validation/outreach";
import { OUTREACH_STATUSES, type OutreachStatus, type Uuid } from "@/types/db";

const OPTIONS = OUTREACH_STATUSES.map((value) => ({
  value,
  label: OUTREACH_STATUS_LABELS[value],
}));

/** Selector de estado inline para el listado de Contacto. */
export function OutreachStatusSelect({
  brandId,
  brandName,
  status,
}: {
  brandId: Uuid;
  brandName: string;
  status: OutreachStatus;
}) {
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  // Valor optimista: se ve al instante y vuelve atras si falla.
  const [value, setValue] = useState<OutreachStatus>(status);
  const [prevStatus, setPrevStatus] = useState(status);
  if (status !== prevStatus) {
    setPrevStatus(status);
    setValue(status);
  }

  function handleChange(next: OutreachStatus) {
    const previous = value;
    setValue(next);
    startTransition(async () => {
      const result = await setOutreachStatus(brandId, next);
      if (result.ok) {
        showToast(`${brandName}: ${OUTREACH_STATUS_LABELS[next]}`, "ok", 2500);
      } else {
        setValue(previous);
        showToast(result.error, "error");
      }
    });
  }

  return (
    <div
      className="flex items-center gap-2"
      // Que el clic en el selector no abra la marca (la fila entera es un enlace).
      onClick={(event) => event.stopPropagation()}
    >
      <Select
        aria-label={`Estado de ${brandName}`}
        value={value}
        options={OPTIONS}
        disabled={isPending}
        onChange={(event) => handleChange(event.target.value as OutreachStatus)}
        className={cn("w-auto py-1 pr-6 pl-2 text-xs font-bold")}
      />
      {isPending ? <Spinner size="sm" label="Guardando" /> : null}
    </div>
  );
}
