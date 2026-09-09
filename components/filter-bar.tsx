"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PriorityFilter, SortDirection, SortKey } from "@/lib/types";
import { ArrowDownAZ, ArrowUpAZ } from "lucide-react";
import { Button } from "@/components/ui/button";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "created_at", label: "Date added" },
  { value: "name", label: "Name" },
  { value: "company", label: "Company" },
  { value: "priority", label: "Priority" },
];

export function FilterBar({
  search,
  onSearchChange,
  priorityFilter,
  onPriorityFilterChange,
  sortKey,
  onSortKeyChange,
  sortDirection,
  onSortDirectionChange,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  priorityFilter: PriorityFilter;
  onPriorityFilterChange: (value: PriorityFilter) => void;
  sortKey: SortKey;
  onSortKeyChange: (value: SortKey) => void;
  sortDirection: SortDirection;
  onSortDirectionChange: (value: SortDirection) => void;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      <Input
        placeholder="Search name, company, role…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="sm:max-w-xs"
        aria-label="Search contacts"
      />
      <Select
        value={priorityFilter}
        onValueChange={(value) => onPriorityFilterChange(value as PriorityFilter)}
      >
        <SelectTrigger aria-label="Filter by priority" className="w-full sm:w-36">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All priorities</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="low">Low</SelectItem>
        </SelectContent>
      </Select>
      <div className="flex gap-2">
        <Select
          value={sortKey}
          onValueChange={(value) => onSortKeyChange(value as SortKey)}
        >
          <SelectTrigger aria-label="Sort by" className="w-full sm:w-40">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={sortDirection === "asc" ? "Sort ascending" : "Sort descending"}
          onClick={() =>
            onSortDirectionChange(sortDirection === "asc" ? "desc" : "asc")
          }
        >
          {sortDirection === "asc" ? (
            <ArrowUpAZ className="size-4" />
          ) : (
            <ArrowDownAZ className="size-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
