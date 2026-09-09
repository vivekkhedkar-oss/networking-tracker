import { Skeleton } from "@/components/ui/skeleton";
import { UsersRound, TriangleAlert } from "lucide-react";

export function LoadingState() {
  return (
    <div className="space-y-2" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading contacts…</span>
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-lg" />
      ))}
    </div>
  );
}

export function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-16 text-center text-muted-foreground">
      <UsersRound className="size-8" aria-hidden="true" />
      <p className="text-sm font-medium text-foreground">
        {hasFilters ? "No contacts match your filters" : "No contacts yet"}
      </p>
      <p className="max-w-xs text-sm">
        {hasFilters
          ? "Try a different search term or priority filter."
          : "Add the first person you want to stay in touch with."}
      </p>
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
    >
      <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
