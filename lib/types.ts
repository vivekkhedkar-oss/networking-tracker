export type Priority = "high" | "medium" | "low";

export type Contact = {
  id: string;
  user_id: string;
  name: string;
  company: string | null;
  role: string | null;
  where_met: string | null;
  notes: string | null;
  priority: Priority;
  created_at: string;
  updated_at: string;
};

export type SortKey = "name" | "company" | "priority" | "created_at";
export type SortDirection = "asc" | "desc";

export type PriorityFilter = Priority | "all";
