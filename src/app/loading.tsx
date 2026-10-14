import { Spinner } from "@/components/ui/Spinner";

export default function Loading() {
  return (
    <div aria-busy="true" className="animate-page-in">
      <div className="border-ink mb-6 flex flex-wrap items-end justify-between gap-4 border-b-2 pb-4">
        <div className="flex flex-col gap-2">
          <div className="skeleton h-8 w-56" />
          <div className="skeleton h-4 w-80 max-w-full" />
        </div>
      </div>

      <div className="border-ink bg-paper shadow-hard hatch flex min-h-64 flex-col items-center justify-center gap-4 border-2 p-10">
        <Spinner size="lg" />
        <p className="label-caps text-ink/60">Cargando…</p>
      </div>
    </div>
  );
}
