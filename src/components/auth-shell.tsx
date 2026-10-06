"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useCart } from "@/lib/cart-store";

/** After ?next=checkout → return to the store with the checkout auto-open. */
function consumeNext(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");
    return next === "checkout" ? "checkout" : null;
  } catch {
    return null;
  }
}

export function AuthShell({
  mode,
}: {
  mode: "login" | "signup";
}) {
  const router = useRouter();
  const items = useCart((s) => s.items);
  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const [verifyUrl, setVerifyUrl] = useState<string | null>(null);
  const [next, setNext] = useState<string | null>(null);

  useEffect(() => {
    setNext(consumeNext());
  }, []);

  function afterAuth() {
    setDone(true);
    if (next === "checkout" && items.length > 0) {
      try {
        sessionStorage.setItem("ono_open_checkout", "1");
      } catch {
        /* private mode */
      }
    }
    router.push("/");
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setFieldErrors({});
    const fd = new FormData(e.currentTarget);
    try {
      if (mode === "login") {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            identifier: fd.get("identifier"),
            password: fd.get("password"),
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success)
          throw new Error(data.error || "Sign in failed.");
        toast.success(`Welcome back, ${data.user.name.split(" ")[0]}!`);
        afterAuth();
      } else {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: fd.get("name"),
            phone: fd.get("phone"),
            email: fd.get("email"),
            password: fd.get("password"),
            website: fd.get("website"), // honeypot — must stay empty
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          setFieldErrors(data.fieldErrors ?? {});
          throw new Error(data.error || "Sign up failed.");
        }
        toast.success("Account created — welcome to One N Only!");
        if (data.verificationUrl) {
          // Email delivery not configured yet: surface the link directly.
          setVerifyUrl(data.verificationUrl);
        }
        afterAuth();
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 flex flex-col">
      <header className="bg-white border-b border-zinc-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="font-display font-bold tracking-tight text-xl"
            aria-label="One N Only — home"
          >
            One<span className="italic text-amber-600">N</span>Only
            <span className="text-amber-600">.</span>
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-zinc-500 hover:text-zinc-950"
          >
            ← Back to store
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border bg-white p-6 sm:p-8 shadow-sm">
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {mode === "login"
                ? "Sign in to place orders and track your deliveries."
                : "One account for orders, tracking and saved addresses."}
            </p>

            {done ? (
              <div className="mt-8 flex flex-col items-center gap-3 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
                <p className="font-semibold">
                  {mode === "login" ? "Signed in!" : "Account created!"}
                </p>
                {verifyUrl && (
                  <div className="mt-2 w-full rounded-xl border border-amber-200 bg-amber-50 p-4 text-left text-xs space-y-2">
                    <p className="flex items-center gap-1.5 font-semibold text-amber-800">
                      <MailCheck className="h-4 w-4" /> Verify your email
                    </p>
                    <p className="text-amber-800">
                      Email delivery isn&apos;t configured yet — verify with
                      this link:
                    </p>
                    <a
                      href={verifyUrl}
                      className="block break-all font-mono text-[11px] text-amber-900 underline"
                    >
                      {verifyUrl}
                    </a>
                  </div>
                )}
                <Button
                  onClick={() => router.push("/")}
                  className="mt-3 h-12 px-10 rounded-full bg-zinc-950 text-white hover:bg-zinc-800"
                >
                  Continue shopping
                </Button>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-6 space-y-4">
                {/* Honeypot — hidden from humans, catnip for bots */}
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  className="hidden"
                />

                {mode === "signup" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="au-name">Full name</Label>
                    <Input
                      id="au-name"
                      name="name"
                      required
                      minLength={2}
                      placeholder="Ahmed Raza"
                      className="h-11"
                    />
                    {fieldErrors.name && (
                      <p className="text-xs text-red-600">{fieldErrors.name}</p>
                    )}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="au-id">
                    {mode === "login" ? "Phone or email" : "Mobile number"}
                  </Label>
                  <Input
                    id="au-id"
                    name={mode === "login" ? "identifier" : "phone"}
                    required
                    placeholder={mode === "login" ? "0300 1234567" : "03XX XXXXXXX"}
                    className="h-11"
                    inputMode={mode === "login" ? "text" : "tel"}
                  />
                  {fieldErrors.phone && (
                    <p className="text-xs text-red-600">{fieldErrors.phone}</p>
                  )}
                  {fieldErrors.identifier && (
                    <p className="text-xs text-red-600">
                      {fieldErrors.identifier}
                    </p>
                  )}
                </div>

                {mode === "signup" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="au-email">Email</Label>
                    <Input
                      id="au-email"
                      name="email"
                      type="email"
                      required
                      placeholder="you@email.com"
                      className="h-11"
                    />
                    {fieldErrors.email && (
                      <p className="text-xs text-red-600">{fieldErrors.email}</p>
                    )}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="au-pass">Password</Label>
                  <Input
                    id="au-pass"
                    name="password"
                    type="password"
                    required
                    minLength={8}
                    placeholder={
                      mode === "signup" ? "At least 8 characters" : "Your password"
                    }
                    className="h-11"
                  />
                  {fieldErrors.password && (
                    <p className="text-xs text-red-600">{fieldErrors.password}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={busy}
                  className="w-full h-12 rounded-full bg-amber-600 hover:bg-amber-500 text-white font-semibold"
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : mode === "login" ? (
                    "Sign in"
                  ) : (
                    "Create account"
                  )}
                </Button>

                <p className="text-center text-sm text-zinc-500">
                  {mode === "login" ? (
                    <>
                      New here?{" "}
                      <Link
                        href="/signup"
                        className="font-semibold text-amber-700 hover:text-amber-800"
                      >
                        Create an account
                      </Link>
                    </>
                  ) : (
                    <>
                      Already have an account?{" "}
                      <Link
                        href="/login"
                        className="font-semibold text-amber-700 hover:text-amber-800"
                      >
                        Sign in
                      </Link>
                    </>
                  )}
                </p>
              </form>
            )}
          </div>

          <p className="mt-4 text-center text-xs text-zinc-400">
            Cash on Delivery nationwide from Faisalabad · Free delivery over
            Rs 5,000
          </p>
        </div>
      </main>
    </div>
  );
}
