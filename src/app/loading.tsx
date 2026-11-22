import { Spinner } from "@/components/ui/Spinner";

export default function Loading() {
  return (
    <div aria-busy="true" className="animate-page-in">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="skeleton h-8 w-56 rounded-lg" />
          <div className="skeleton h-4 w-80 max-w-full rounded-md" />
        </div>
      </div>

      <div className="bg-paper text-ink/40 flex min-h-64 flex-col items-center justify-center gap-3 rounded-xl border p-10">
        <Spinner size="lg" />
        <p className="text-ink/55 text-sm">Cargando…</p>
      </div>
    </div>
  );
}
