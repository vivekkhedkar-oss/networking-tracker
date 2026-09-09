"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PriorityBadge } from "@/components/priority-badge";
import type { Contact } from "@/lib/types";
import { Pencil, Trash2 } from "lucide-react";

export function ContactCards({
  contacts,
  onEdit,
  onDelete,
}: {
  contacts: Contact[];
  onEdit: (contact: Contact) => void;
  onDelete: (contact: Contact) => void;
}) {
  return (
    <div className="flex flex-col gap-2 sm:hidden">
      {contacts.map((contact) => (
        <Card key={contact.id}>
          <CardContent className="flex flex-col gap-2 px-4 py-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{contact.name}</p>
                {contact.company || contact.role ? (
                  <p className="text-sm text-muted-foreground">
                    {[contact.role, contact.company].filter(Boolean).join(" · ")}
                  </p>
                ) : null}
              </div>
              <PriorityBadge priority={contact.priority} />
            </div>

            {contact.where_met && (
              <p className="text-sm text-muted-foreground">
                Met at {contact.where_met}
              </p>
            )}

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-muted-foreground">
                Added {new Date(contact.created_at).toLocaleDateString()}
              </span>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(contact)}
                >
                  <Pencil className="size-3.5" />
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(contact)}
                >
                  <Trash2 className="size-3.5" />
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
