"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { neon } from "@/lib/neon-client";
import { LoadingState } from "@/components/states";

export default function Home() {
  const router = useRouter();
  const session = neon.auth.useSession();

  useEffect(() => {
    if (session.isPending) return;
    router.replace(session.data ? "/contacts" : "/sign-in");
  }, [session.isPending, session.data, router]);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
      <LoadingState />
    </main>
  );
}
