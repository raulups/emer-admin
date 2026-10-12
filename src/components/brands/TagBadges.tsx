import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import type { BrandTag } from "@/types/db";

export function TagBadges({
  tags,
  className,
  emptyLabel = "Sin tags",
}: {
  tags: BrandTag[];
  className?: string;
  emptyLabel?: string | null;
}) {
  if (tags.length === 0) {
    return emptyLabel ? <span className="text-ink/40 text-xs">{emptyLabel}</span> : null;
  }

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {tags.map((tag) => (
        <Badge key={tag} tone="muted">
          {tag}
        </Badge>
      ))}
    </div>
  );
}
