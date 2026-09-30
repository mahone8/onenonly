"use client";

import { useEffect, useState } from "react";

export type SessionUser = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  role: string;
  addressLine: string | null;
  city: string | null;
  emailVerified: boolean;
};

/** Client session state from /api/auth/me (hydration-safe). */
export function useSession() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const data = await res.json();
        if (alive) setUser(data.user ?? null);
      } catch {
        if (alive) setUser(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return { user, loading, setUser };
}
