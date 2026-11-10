"use client";

import { useState } from "react";

import { deleteOutreachMessage } from "@/app/outreach/actions";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import type { Uuid } from "@/types/db";

export interface DeleteMessageButtonProps {
  brandId: Uuid;
  messageId: Uuid;
  /** `dark` para pintarlo sobre fondo negro. */
  tone?: "light" | "dark";
}

export function DeleteMessageButton({
  brandId,
  messageId,
  tone = "light",
}: DeleteMessageButtonProps) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);

  async function onConfirm() {
    const result = await deleteOutreachMessage(brandId, messageId);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    setOpen(false);
    showToast("Mensaje borrado.", "ok");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "cursor-pointer text-[10px] font-bold tracking-widest uppercase transition-colors duration-[120ms]",
          tone === "dark" ? "text-cream/60 hover:text-cream" : "text-ink/50 hover:text-error",
        )}
      >
        Borrar
      </button>
      <ConfirmDialog
        open={open}
        title="Borrar mensaje"
        description="El mensaje desaparece del historial. El estado de la petición no cambia."
        confirmLabel="Borrar"
        onConfirm={onConfirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
