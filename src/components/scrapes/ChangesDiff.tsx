import type { Json } from "@/types/db";

interface ChangeEntry {
  field: string;
  before: Json | undefined;
  after: Json | undefined;
}

const BEFORE_KEYS = ["old", "before", "from", "prev", "previous"];
const AFTER_KEYS = ["new", "after", "to", "next", "current"];

function isObject(value: Json | undefined): value is { [key: string]: Json } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pick(value: { [key: string]: Json }, keys: string[]): { found: boolean; value?: Json } {
  for (const key of keys) {
    if (key in value) return { found: true, value: value[key] };
  }
  return { found: false };
}

function toEntry(field: string, value: Json): ChangeEntry {
  if (isObject(value)) {
    const before = pick(value, BEFORE_KEYS);
    const after = pick(value, AFTER_KEYS);
    if (before.found || after.found) return { field, before: before.value, after: after.value };
  }
  if (Array.isArray(value) && value.length === 2) {
    return { field, before: value[0], after: value[1] };
  }
  return { field, before: undefined, after: value };
}

export function parseChanges(changes: Json | null): ChangeEntry[] | null {
  if (changes === null) return [];
  if (Array.isArray(changes)) {
    const entries: ChangeEntry[] = [];
    for (const item of changes) {
      if (!isObject(item)) return null;
      const name = item.field ?? item.column ?? item.key ?? item.name;
      if (typeof name !== "string") return null;
      entries.push(toEntry(name, item));
    }
    return entries;
  }
  if (isObject(changes)) {
    return Object.entries(changes).map(([field, value]) => toEntry(field, value));
  }
  return null;
}

function formatValue(value: Json | undefined): string {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value, null, 2);
}

export function ChangesDiff({ changes }: { changes: Json | null }) {
  const entries = parseChanges(changes);

  if (entries === null) {
    return (
      <pre className="border-line bg-subtle max-w-3xl overflow-x-auto border p-2 text-[11px] whitespace-pre-wrap">
        {JSON.stringify(changes, null, 2)}
      </pre>
    );
  }

  if (entries.length === 0) {
    return <p className="text-ink/60 text-xs">Sin cambios registrados.</p>;
  }

  return (
    <div className="border-line max-w-3xl overflow-x-auto border">
      <table className="w-full border-collapse text-left text-xs">
        <thead className="bg-subtle">
          <tr className="border-line border-b">
            <th className="px-2 py-1 text-[11px] font-semibold">Campo</th>
            <th className="px-2 py-1 text-[11px] font-semibold">Antes</th>
            <th className="px-2 py-1 text-[11px] font-semibold">Después</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.field} className="border-line border-b last:border-b-0">
              <td className="px-2 py-1 align-top font-semibold whitespace-nowrap">{entry.field}</td>
              <td className="text-error px-2 py-1 align-top break-all whitespace-pre-wrap">
                {formatValue(entry.before)}
              </td>
              <td className="text-ok px-2 py-1 align-top break-all whitespace-pre-wrap">
                {formatValue(entry.after)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
