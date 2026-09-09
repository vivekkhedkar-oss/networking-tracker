"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getAuthToken, neon } from "@/lib/neon-client";
import { Button } from "@/components/ui/button";
import { FilterBar } from "@/components/filter-bar";
import { ContactTable } from "@/components/contact-table";
import { ContactCards } from "@/components/contact-cards";
import { ContactFormDialog } from "@/components/contact-form-dialog";
import { DeleteConfirmDialog } from "@/components/delete-confirm";
import { EmptyState, ErrorBanner, LoadingState } from "@/components/states";
import type {
  Contact,
  PriorityFilter,
  SortDirection,
  SortKey,
} from "@/lib/types";
import { Plus, LogOut } from "lucide-react";

async function authorizedFetch(input: string, init: RequestInit = {}) {
  const token = await getAuthToken();
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  if (token) headers.set("authorization", `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}

export default function ContactsPage() {
  const router = useRouter();
  const session = neon.auth.useSession();

  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const [formOpen, setFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deletingContact, setDeletingContact] = useState<Contact | null>(null);

  const loadContacts = useCallback(async () => {
    setLoadError(null);
    const { data, error } = await neon.from("contacts").select("*");
    if (error) {
      setLoadError(error.message);
      return;
    }
    setContacts((data as Contact[]) ?? []);
  }, []);

  useEffect(() => {
    if (session.isPending) return;
    if (!session.data) {
      router.replace("/sign-in");
      return;
    }
    // Synchronizing with the server (Data API) on session ready, not a
    // derived-state anti-pattern — the async fetch's setState happens after
    // this effect body returns, not synchronously within it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadContacts();
  }, [session.isPending, session.data, router, loadContacts]);

  const visibleContacts = useMemo(() => {
    if (!contacts) return [];
    const needle = search.trim().toLowerCase();

    const filtered = contacts.filter((contact) => {
      if (priorityFilter !== "all" && contact.priority !== priorityFilter) {
        return false;
      }
      if (!needle) return true;
      return [contact.name, contact.company, contact.role]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(needle));
    });

    const sorted = [...filtered].sort((a, b) => {
      const aValue = a[sortKey] ?? "";
      const bValue = b[sortKey] ?? "";
      const comparison = String(aValue).localeCompare(String(bValue));
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [contacts, search, priorityFilter, sortKey, sortDirection]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }

  async function handleCreateOrUpdate(values: {
    name: string;
    company: string;
    role: string;
    where_met: string;
    notes: string;
    priority: Contact["priority"];
  }): Promise<string | null> {
    const isEdit = !!editingContact;
    const url = isEdit ? `/api/contacts/${editingContact!.id}` : "/api/contacts";
    const res = await authorizedFetch(url, {
      method: isEdit ? "PATCH" : "POST",
      body: JSON.stringify(values),
    });
    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      return body.error ?? "Something went wrong. Please try again.";
    }

    toast.success(isEdit ? "Contact updated" : "Contact added");
    await loadContacts();
    return null;
  }

  async function handleDelete(contact: Contact) {
    const res = await authorizedFetch(`/api/contacts/${contact.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error ?? "Could not delete contact.");
      return;
    }
    toast.success("Contact deleted");
    setDeletingContact(null);
    await loadContacts();
  }

  async function handleSignOut() {
    await neon.auth.signOut();
    router.replace("/sign-in");
  }

  if (session.isPending || (!loadError && contacts === null)) {
    return (
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
        <LoadingState />
      </main>
    );
  }

  if (!session.data) {
    // Redirect effect above is already firing; render nothing meanwhile.
    return null;
  }

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Your network
          </h1>
          <p className="text-sm text-muted-foreground">
            Signed in as {session.data.user.email}
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={handleSignOut}>
          <LogOut className="size-4" />
          Sign out
        </Button>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          priorityFilter={priorityFilter}
          onPriorityFilterChange={setPriorityFilter}
          sortKey={sortKey}
          onSortKeyChange={setSortKey}
          sortDirection={sortDirection}
          onSortDirectionChange={setSortDirection}
        />
        <Button
          type="button"
          onClick={() => {
            setEditingContact(null);
            setFormOpen(true);
          }}
        >
          <Plus className="size-4" />
          Add contact
        </Button>
      </div>

      {loadError && <ErrorBanner message={loadError} />}

      {!loadError && contacts && contacts.length === 0 && (
        <EmptyState hasFilters={false} />
      )}

      {!loadError &&
        contacts &&
        contacts.length > 0 &&
        visibleContacts.length === 0 && <EmptyState hasFilters />}

      {!loadError && visibleContacts.length > 0 && (
        <>
          <ContactTable
            contacts={visibleContacts}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSort={handleSort}
            onEdit={(contact) => {
              setEditingContact(contact);
              setFormOpen(true);
            }}
            onDelete={setDeletingContact}
          />
          <ContactCards
            contacts={visibleContacts}
            onEdit={(contact) => {
              setEditingContact(contact);
              setFormOpen(true);
            }}
            onDelete={setDeletingContact}
          />
        </>
      )}

      <ContactFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        contact={editingContact}
        onSubmit={handleCreateOrUpdate}
      />

      <DeleteConfirmDialog
        contact={deletingContact}
        onOpenChange={(open) => {
          if (!open) setDeletingContact(null);
        }}
        onConfirm={handleDelete}
      />
    </main>
  );
}
