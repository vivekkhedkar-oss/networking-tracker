import { Badge } from "@/components/ui/badge";
import type { Priority } from "@/lib/types";

const VARIANT: Record<Priority, "destructive" | "secondary" | "outline"> = {
  high: "destructive",
  medium: "secondary",
  low: "outline",
};

const LABEL: Record<Priority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <Badge variant={VARIANT[priority]}>{LABEL[priority]}</Badge>;
}
