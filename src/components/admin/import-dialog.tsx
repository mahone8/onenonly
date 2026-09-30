"use client";

import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileJson,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { VALID_CATEGORIES } from "@/lib/validate";
import type { Product } from "@/components/store/types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Current catalogue, used to preview create-vs-update counts. */
  products: Product[];
  /** Called after a successful import so the parent can refresh. */
  onImported: () => Promise<void>;
};

type Preview = {
  total: number;
  updates: number;
  creates: number;
  invalid: string[];
  uploadsRefs: number;
  names: string[];
};

function looksValid(p: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const name = typeof p.name === "string" ? p.name.trim() : "";
  if (!name) errors.push("missing name");
  const category = typeof p.category === "string" ? p.category.trim() : "";
  if (!VALID_CATEGORIES.includes(category)) errors.push("invalid category");
  const price = Number(p.price);
  if (!Number.isFinite(price) || price <= 0) errors.push("invalid price");
  if (typeof p.description !== "string" || p.description.trim().length < 10)
    errors.push("description too short");
  const image = typeof p.image === "string" ? p.image.trim() : "";
  if (!image) errors.push("missing image");
  return errors;
}

/**
 * Bulk product import — accepts the JSON file produced by the Export button
 * (or a raw product array). Existing products are matched by slug (fallback:
 * name) and updated in place; everything else is created.
 */
export function ImportDialog({ open, onOpenChange, products, onImported }: Props) {
  const [raw, setRaw] = useState("");
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const existingSlugs = useMemo(
    () => new Set(products.map((p) => p.slug)),
    [products]
  );
  const existingNames = useMemo(
    () => new Set(products.map((p) => p.name.trim().toLowerCase())),
    [products]
  );

  const preview: Preview | null = useMemo(() => {
    if (!raw.trim()) return null;
    try {
      const parsed = JSON.parse(raw);
      const rows: unknown[] = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.products)
          ? parsed.products
          : [];
      if (rows.length === 0) return null;

      let updates = 0;
      let creates = 0;
      let uploadsRefs = 0;
      const invalid: string[] = [];
      const names: string[] = [];

      rows.slice(0, 500).forEach((item, i) => {
        if (typeof item !== "object" || item === null) {
          invalid.push(`Row ${i + 1}: not a product object`);
          return;
        }
        const p = item as Record<string, unknown>;
        const errs = looksValid(p);
        if (errs.length > 0) {
          invalid.push(`Row ${i + 1} (${String(p.name || "unnamed")}): ${errs.join(", ")}`);
          return;
        }
        const slug = typeof p.slug === "string" ? p.slug : "";
        const name = String(p.name).trim().toLowerCase();
        if ((slug && existingSlugs.has(slug)) || existingNames.has(name)) {
          updates += 1;
        } else {
          creates += 1;
        }
        if (
          (typeof p.image === "string" && p.image.startsWith("/uploads/")) ||
          (Array.isArray(p.images) &&
            p.images.some(
              (x) => typeof x === "string" && x.startsWith("/uploads/")
            ))
        ) {
          uploadsRefs += 1;
        }
        names.push(String(p.name));
      });

      return {
        total: Math.min(rows.length, 500),
        updates,
        creates,
        invalid,
        uploadsRefs,
        names: names.slice(0, 6),
      };
    } catch {
      return null;
    }
  }, [raw, existingSlugs, existingNames]);

  function reset() {
    setRaw("");
    setFileName("");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function readFile(file: File) {
    setFileName(file.name);
    const text = await file.text();
    setRaw(text);
  }

  async function runImport() {
    if (!preview || preview.total === 0) return;
    setBusy(true);
    try {
      const parsed = JSON.parse(raw);
      const rows = Array.isArray(parsed) ? parsed : parsed?.products;
      const res = await fetch("/api/admin/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: rows }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || "Import failed.");
        if (Array.isArray(data.errors) && data.errors.length > 0) {
          console.error("Import errors:", data.errors);
        }
        return;
      }
      toast.success(
        `Imported — ${data.created} added, ${data.updated} updated${
          data.failed > 0 ? `, ${data.failed} skipped` : ""
        }.`,
        { duration: 6000 }
      );
      if (data.failed > 0 && Array.isArray(data.errors)) {
        console.error("Import skipped rows:", data.errors);
      }
      reset();
      onOpenChange(false);
      await onImported();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Import failed — check the file."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!busy) onOpenChange(o); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import products</DialogTitle>
          <DialogDescription>
            Load the JSON file you downloaded with{" "}
            <span className="font-medium text-zinc-700">Export</span>. Products
            that already exist (matched by slug or name) are updated in place —
            new ones are added. Orders and reviews are never touched.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <label
            className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-zinc-50 px-4 py-8 text-center cursor-pointer hover:border-amber-500 hover:bg-amber-50/40 transition-colors"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file) void readFile(file);
            }}
          >
            <FileJson className="h-8 w-8 text-zinc-400" />
            <span className="text-sm font-medium">
              {fileName || "Drop your export file here, or click to browse"}
            </span>
            <span className="text-xs text-muted-foreground">
              .json file from the Export button
            </span>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void readFile(file);
              }}
            />
          </label>

          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground">
              …or paste JSON instead
            </summary>
            <Textarea
              value={raw}
              onChange={(e) => {
                setRaw(e.target.value);
                setFileName("");
              }}
              placeholder='{"products": [ … ]}'
              className="mt-2 font-mono text-xs min-h-24"
              aria-label="Paste product JSON"
            />
          </details>

          {preview && (
            <div className="rounded-xl border bg-white p-4 text-sm space-y-2">
              <p className="font-medium">
                File looks good — {preview.total} product
                {preview.total === 1 ? "" : "s"} found:
              </p>
              <ul className="text-muted-foreground space-y-1">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  {preview.creates} new will be added
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-amber-600" />
                  {preview.updates} existing will be updated
                </li>
                {preview.invalid.length > 0 && (
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 text-red-500 shrink-0" />
                    <span>
                      {preview.invalid.length} row
                      {preview.invalid.length === 1 ? "" : "s"} will be skipped (
                      {preview.invalid.slice(0, 3).join("; ")}
                      {preview.invalid.length > 3 ? "…" : ""})
                    </span>
                  </li>
                )}
              </ul>
              {preview.names.length > 0 && (
                <p className="text-xs text-muted-foreground truncate">
                  e.g. {preview.names.join(" · ")}
                  {preview.total > 6 ? " …" : ""}
                </p>
              )}
              {preview.uploadsRefs > 0 && (
                <p className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-800">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  {preview.uploadsRefs} product
                  {preview.uploadsRefs === 1 ? "" : "s"} use device-uploaded
                  images (/uploads/…). Those files live on the original server —
                  re-upload them on the new store or swap in hosted URLs after
                  importing.
                </p>
              )}
            </div>
          )}

          {raw.trim() && !preview && (
            <p className="flex items-center gap-2 text-sm text-red-600">
              <X className="h-4 w-4" /> Could not read that file — it must be
              the JSON from Export (containing a &quot;products&quot; array).
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              onClick={runImport}
              disabled={busy || !preview || preview.total === 0}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Import {preview ? preview.total : ""} product
              {preview && preview.total === 1 ? "" : "s"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
