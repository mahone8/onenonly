import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getCurrentUser,
  hashPassword,
  toSafeUser,
  verifyPassword,
} from "@/lib/auth";
import {
  issueEmailVerification,
  validateEmail,
  validateName,
  validatePassword,
} from "@/lib/user-auth";

/**
 * PATCH /api/account — update profile (name, email, saved address) or change
 * password. Email changes re-issue verification. Password changes require the
 * current password.
 */
export async function PATCH(req: NextRequest) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json(
      { success: false, error: "Please sign in to continue." },
      { status: 401 }
    );
  }

  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid request." },
        { status: 400 }
      );
    }

    const row = await db.user.findUnique({ where: { id: current.id } });
    if (!row) {
      return NextResponse.json(
        { success: false, error: "Account not found." },
        { status: 404 }
      );
    }

    const data: Record<string, unknown> = {};
    const fieldErrors: Record<string, string> = {};

    if (body.name !== undefined) {
      const err = validateName(body.name);
      if (err) fieldErrors.name = err;
      else data.name = String(body.name).trim();
    }

    let emailChanged = false;
    if (body.email !== undefined && String(body.email).trim().toLowerCase() !== row.email) {
      const { value, error } = validateEmail(body.email);
      if (error) fieldErrors.email = error;
      else {
        const taken = await db.user.findFirst({
          where: { email: value, NOT: { id: row.id } },
        });
        if (taken) fieldErrors.email = "This email is already in use.";
        else {
          data.email = value;
          emailChanged = true;
        }
      }
    }

    if (body.addressLine !== undefined) {
      const a = typeof body.addressLine === "string" ? body.addressLine.trim() : "";
      if (a.length > 200) fieldErrors.addressLine = "Address is too long.";
      else data.addressLine = a || null;
    }
    if (body.city !== undefined) {
      const c = typeof body.city === "string" ? body.city.trim() : "";
      if (c.length > 80) fieldErrors.city = "City is too long.";
      else data.city = c || null;
    }

    if (body.newPassword !== undefined && String(body.newPassword) !== "") {
      const err = validatePassword(body.newPassword);
      if (err) {
        fieldErrors.newPassword = err;
      } else if (
        !body.currentPassword ||
        !(await verifyPassword(String(body.currentPassword), row.passwordHash))
      ) {
        fieldErrors.currentPassword = "Your current password is incorrect.";
      } else {
        data.passwordHash = await hashPassword(String(body.newPassword));
      }
    }

    if (Object.keys(fieldErrors).length > 0) {
      return NextResponse.json(
        { success: false, error: "Please fix the highlighted fields.", fieldErrors },
        { status: 400 }
      );
    }

    let updated = await db.user.update({ where: { id: row.id }, data });

    let verificationUrl: string | undefined;
    if (emailChanged && updated.email) {
      const issued = await issueEmailVerification(
        updated.id,
        updated.email,
        updated.name
      );
      if (!issued.emailed) verificationUrl = issued.verificationUrl;
    }

    return NextResponse.json({
      success: true,
      user: toSafeUser(updated),
      verificationUrl,
    });
  } catch (error) {
    console.error("PATCH /api/account error:", error);
    return NextResponse.json(
      { success: false, error: "Could not update your account." },
      { status: 500 }
    );
  }
}
