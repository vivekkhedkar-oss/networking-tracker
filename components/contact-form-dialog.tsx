"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { contactInputSchema } from "@/lib/validation";
import type { Contact, Priority } from "@/lib/types";

type FormState = {
  name: string;
  company: string;
  role: string;
  where_met: string;
  notes: string;
  priority: Priority;
};

const EMPTY_FORM: FormState = {
  name: "",
  company: "",
  role: "",
  where_met: "",
  notes: "",
  priority: "medium",
};

function toFormState(contact: Contact | null): FormState {
  if (!contact) return EMPTY_FORM;
  return {
    name: contact.name,
    company: contact.company ?? "",
    role: contact.role ?? "",
    where_met: contact.where_met ?? "",
    notes: contact.notes ?? "",
    priority: contact.priority,
  };
}

export function ContactFormDialog({
  open,
  onOpenChange,
  contact,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null → create mode, a Contact → edit mode */
  contact: Contact | null;
  /** Returns an error message on failure, or null on success. */
  onSubmit: (values: FormState) => Promise<string | null>;
}) {
  const [form, setForm] = useState<FormState>(() => toFormState(contact));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      // Resetting local form state to match the (contact, open) props when
      // the dialog opens — an external-system sync, not derived render state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(toFormState(contact));
      setFieldErrors({});
      setFormError(null);
    }
  }, [open, contact]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    // Client-side check for immediate feedback; the server (and ultimately
    // Postgres) re-validates independently and is the real authority.
    const parsed = contactInputSchema.safeParse(form);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setSubmitting(true);
    const error = await onSubmit(form);
    setSubmitting(false);

    if (error) {
      setFormError(error);
      return;
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="contents">
          <DialogHeader>
            <DialogTitle>{contact ? "Edit contact" : "Add contact"}</DialogTitle>
            <DialogDescription>
              {contact
                ? "Update the details for this contact."
                : "Add someone you want to stay connected with."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="contact-name">Name</Label>
              <Input
                id="contact-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                aria-invalid={!!fieldErrors.name}
                autoFocus
              />
              {fieldErrors.name && (
                <p className="text-sm text-destructive">{fieldErrors.name}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="contact-company">Company</Label>
                <Input
                  id="contact-company"
                  value={form.company}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, company: e.target.value }))
                  }
                />
                {fieldErrors.company && (
                  <p className="text-sm text-destructive">{fieldErrors.company}</p>
                )}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="contact-role">Role</Label>
                <Input
                  id="contact-role"
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                />
                {fieldErrors.role && (
                  <p className="text-sm text-destructive">{fieldErrors.role}</p>
                )}
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="contact-where-met">Where you met</Label>
              <Input
                id="contact-where-met"
                value={form.where_met}
                onChange={(e) =>
                  setForm((f) => ({ ...f, where_met: e.target.value }))
                }
              />
              {fieldErrors.where_met && (
                <p className="text-sm text-destructive">{fieldErrors.where_met}</p>
              )}
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="contact-priority">Priority</Label>
              <Select
                value={form.priority}
                onValueChange={(value) =>
                  setForm((f) => ({ ...f, priority: value as Priority }))
                }
              >
                <SelectTrigger id="contact-priority" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="contact-notes">Notes</Label>
              <Textarea
                id="contact-notes"
                rows={3}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
              {fieldErrors.notes && (
                <p className="text-sm text-destructive">{fieldErrors.notes}</p>
              )}
            </div>

            {formError && (
              <p role="alert" className="text-sm text-destructive">
                {formError}
              </p>
            )}
          </div>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : contact ? "Save changes" : "Add contact"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
