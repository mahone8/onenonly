import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";

export const metadata: Metadata = {
  title: "Sign in — One N Only",
  robots: { index: false, follow: true },
};

export default function LoginPage() {
  return <AuthShell mode="login" />;
}
