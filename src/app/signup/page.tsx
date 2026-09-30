import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";

export const metadata: Metadata = {
  title: "Create account — One N Only",
  robots: { index: false, follow: true },
};

export default function SignupPage() {
  return <AuthShell mode="signup" />;
}
