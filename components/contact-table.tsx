"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PriorityBadge } from "@/components/priority-badge";
import type { Contact, SortDirection, SortKey } from "@/lib/types";
import { ArrowDown, ArrowUp, ArrowUpDown, Pencil, Trash2 } from "lucide-react";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "company", label: "Company" },
  { key: "priority", label: "Priority" },
  { key: "created_at", label: "Added" },
];

function SortIcon({ active, direction }: { active: boolean; direction: SortDirection }) {
  if (!active) return <ArrowUpDown className="size-3.5 text-muted-foreground" />;
  return direction === "asc" ? (
    <ArrowUp className="size-3.5" />
  ) : (
    <ArrowDown className="size-3.5" />
  );
}

export function ContactTable({
  contacts,
  sortKey,
  sortDirection,
  onSort,
  onEdit,
  onDelete,
}: {
  contacts: Contact[];
  sortKey: SortKey;
  sortDirection: SortDirection;
  onSort: (key: SortKey) => void;
  onEdit: (contact: Contact) => void;
  onDelete: (contact: Contact) => void;
}) {
  return (
    <div className="hidden overflow-hidden rounded-lg border sm:block">
      <Table>
        <TableHeader>
          <TableRow>
            {COLUMNS.map((column) => (
              <TableHead key={column.key}>
                <button
                  type="button"
                  onClick={() => onSort(column.key)}
                  className="flex items-center gap-1 font-medium hover:text-foreground"
                >
                  {column.label}
                  <SortIcon active={sortKey === column.key} direction={sortDirection} />
                </button>
              </TableHead>
            ))}
            <TableHead>Where met</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map((contact) => (
            <TableRow key={contact.id}>
              <TableCell className="font-medium">{contact.name}</TableCell>
              <TableCell className="text-muted-foreground">
                {contact.company ?? "—"}
              </TableCell>
              <TableCell>
                <PriorityBadge priority={contact.priority} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(contact.created_at).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {contact.where_met ?? "—"}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Edit ${contact.name}`}
                    onClick={() => onEdit(contact)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Delete ${contact.name}`}
                    onClick={() => onDelete(contact)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
