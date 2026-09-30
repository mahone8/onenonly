"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  ImagePlus,
  Loader2,
  Star,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Category, Product } from "@/components/store/types";

const CDN = "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/";

const FALLBACK_CATEGORIES: Category[] = [
  { slug: "caps", name: "Caps" },
  { slug: "wallets", name: "Wallets" },
  { slug: "bracelets", name: "Bracelets" },
  { slug: "glasses", name: "Glasses" },
  { slug: "watches", name: "Watches" },
];

// Real product photos (verified) the admin can use with one click
const SAMPLE_IMAGES: Record<string, string[]> = {
  caps: [
    "f67af5ff86f6.jpg",
    "622caed40403.jpg",
    "843f9959a964.png",
    "9954e6929190.png",
    "2d5fa0e8006e.jpg",
  ],
  wallets: [
    "d83450d3877e.jpg",
    "d9b3cbaf6561.jpg",
    "03dc421a9e3a.jpg",
    "30ab99495850.jpg",
    "0f32e1bb92eb.jpg",
  ],
  bracelets: [
    "57f41d4fd1c0.jpg",
    "556e6f7566aa.jpg",
    "b8816b11b49a.jpg",
    "3ea67b37ec02.jpg",
    "7a0ee21cefea.jpg",
  ],
  glasses: [
    "7d8ed9678635.png",
    "f15da1d3c7bf.jpg",
    "3b5665db8498.jpg",
    "889ece7701ec.jpg",
    "c9341d2b16c9.jpg",
  ],
  watches: [
    "79a6138f1c24.jpg",
    "0e788ab2cc26.jpg",
    "020334db9208.jpg",
    "8823294d7d74.jpeg",
    "84f2ac745b3f.jpg",
  ],
};

type FormState = {
  name: string;
  category: string;
  brand: string;
  strap: string;
  caseSize: string;
  price: string;
  comparePrice: string;
  description: string;
  image: string;
  images: string[];
  badge: string;
  stock: string;
  featured: boolean;
};

function initialState(product?: Product | null): FormState {
  return {
    name: product?.name ?? "",
    category: product?.category ?? "caps",
    brand: product?.brand ?? "",
    strap: product?.strap ?? "",
    caseSize: product?.caseSize ?? "",
    price: product ? String(product.price) : "",
    comparePrice:
      product?.comparePrice != null ? String(product.comparePrice) : "",
    description: product?.description ?? "",
    image: product?.image ?? "",
    images: product?.images ?? [],
    badge: product?.badge ?? "",
    stock: product ? String(product.stock) : "25",
    featured: product?.featured ?? false,
  };
}

type Props = {
  product?: Product | null;
  categories: Category[];
  onSaved: (product: Product) => void;
  onCancel?: () => void;
};

export function ProductForm({ product, categories, onSaved, onCancel }: Props) {
  const isEdit = Boolean(product);
  const [form, setForm] = useState<FormState>(() => initialState(product));
  const [saving, setSaving] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const mainFileRef = useRef<HTMLInputElement>(null);
  const galleryFileRef = useRef<HTMLInputElement>(null);

  // Reset the form when switching between products in the edit dialog
  useEffect(() => {
    setForm(initialState(product));
    setErrors([]);
    setImgError(false);
  }, [product]);

  const set = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const samples = useMemo(
    () => (SAMPLE_IMAGES[form.category] ?? []).map((f) => CDN + f),
    [form.category]
  );

  const previewUrl = form.image.trim();

  /** Upload files from the device to /api/upload (admin-only endpoint). */
  async function uploadFiles(files: FileList | null): Promise<string[]> {
    if (!files || files.length === 0) return [];
    setUploading(true);
    try {
      const fd = new FormData();
      Array.from(files).forEach((file) => fd.append("file", file));
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Upload failed.");
      }
      return (data.urls as string[]) ?? [data.url];
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Upload failed. Try again."
      );
      return [];
    } finally {
      setUploading(false);
    }
  }

  async function handleMainUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const [url] = await uploadFiles(e.target.files);
    if (url) {
      set("image", url);
      setImgError(false);
    }
    if (mainFileRef.current) mainFileRef.current.value = "";
  }

  async function handleGalleryUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const urls = await uploadFiles(e.target.files);
    if (urls.length > 0) {
      setForm((f) => ({
        ...f,
        images: [...f.images, ...urls.filter((u) => !f.images.includes(u))].slice(0, 8),
      }));
      toast.success(
        `${urls.length} image${urls.length === 1 ? "" : "s"} added to the gallery.`
      );
    }
    if (galleryFileRef.current) galleryFileRef.current.value = "";
  }

  function validate(): string[] {
    const errs: string[] = [];
    if (!form.name.trim()) errs.push("Product name is required.");
    const price = Number(form.price);
    if (!form.price.trim() || !Number.isFinite(price) || price <= 0)
      errs.push("Price must be a number greater than 0.");
    if (form.comparePrice.trim()) {
      const cp = Number(form.comparePrice);
      if (!Number.isFinite(cp) || cp <= 0)
        errs.push("Compare price must be a positive number.");
      else if (Number.isFinite(price) && cp <= price)
        errs.push("Compare price should be higher than the selling price.");
    }
    if (form.description.trim().length < 10)
      errs.push("Description should be at least 10 characters.");
    const img = form.image.trim();
    if (!img)
      errs.push(
        "Main image is required — upload from your device, paste a link or pick a sample."
      );
    else if (!/^https?:\/\/.+/i.test(img) && !img.startsWith("/uploads/"))
      errs.push("Image must be an uploaded file or a valid http(s) URL.");
    const stock = Number(form.stock);
    if (!Number.isInteger(stock) || stock < 0)
      errs.push("Stock must be a non-negative whole number.");
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (errs.length > 0) {
      setErrors(errs);
      toast.error("Please fix the highlighted fields.");
      return;
    }
    setErrors([]);
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      category: form.category,
      brand: form.brand.trim() || null,
      strap: form.strap.trim() || null,
      caseSize: form.caseSize.trim() || null,
      price: Number(form.price),
      comparePrice: form.comparePrice.trim() ? Number(form.comparePrice) : null,
      description: form.description.trim(),
      image: form.image.trim(),
      images: form.images.filter((u) => u && u !== form.image.trim()).slice(0, 8),
      badge: form.badge.trim() || null,
      stock: Number(form.stock),
      featured: form.featured,
    };

    try {
      const res = await fetch(
        isEdit ? `/api/products/${product!.id}` : "/api/products",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Something went wrong.");
      }
      toast.success(
        isEdit
          ? `“${data.product.name}” was updated.`
          : `“${data.product.name}” is now live in your store.`
      );
      onSaved(data.product as Product);
      if (!isEdit) {
        setForm(initialState(null));
        setImgError(false);
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to save product.";
      setErrors([msg]);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div className="grid gap-6 lg:grid-cols-5">
        {/* ------- Left: details ------- */}
        <div className="space-y-5 lg:col-span-3">
          <div className="space-y-2">
            <Label htmlFor="p-name">
              Product name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="p-name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Heritage Bifold Wallet"
              maxLength={120}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="p-category">
                Category <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.category}
                onValueChange={(v) => set("category", v)}
              >
                <SelectTrigger id="p-category" className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {(categories.length > 0 ? categories : FALLBACK_CATEGORIES).map(
                    (c) => (
                      <SelectItem key={c.slug} value={c.slug}>
                        {c.name}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-badge">Badge (optional)</Label>
              <Input
                id="p-badge"
                value={form.badge}
                onChange={(e) => set("badge", e.target.value)}
                placeholder="NEW, SALE, BESTSELLER…"
                maxLength={24}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="p-price">
                Price (Rs) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="p-price"
                type="number"
                min="1"
                step="any"
                inputMode="decimal"
                value={form.price}
                onChange={(e) => set("price", e.target.value)}
                placeholder="7990"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-compare">Compare at (Rs)</Label>
              <Input
                id="p-compare"
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                value={form.comparePrice}
                onChange={(e) => set("comparePrice", e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-stock">Stock (units)</Label>
              <Input
                id="p-stock"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={form.stock}
                onChange={(e) => set("stock", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="p-desc">
              Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="p-desc"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Tell customers what makes this product special — materials, fit, finish…"
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {form.description.trim().length} / 10 characters minimum
            </p>
          </div>

          {/* Watch attributes — power the brand/strap/case filters on the store */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="p-brand">Brand</Label>
              <Input
                id="p-brand"
                value={form.brand}
                onChange={(e) => set("brand", e.target.value)}
                placeholder="e.g. Casio"
                maxLength={40}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-strap">Strap type</Label>
              <Input
                id="p-strap"
                value={form.strap}
                onChange={(e) => set("strap", e.target.value)}
                placeholder="Leather, Steel…"
                maxLength={40}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-case">Case size</Label>
              <Input
                id="p-case"
                value={form.caseSize}
                onChange={(e) => set("caseSize", e.target.value)}
                placeholder='e.g. 40mm'
                maxLength={40}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground -mt-3">
            Optional details — they power the watch filters (brand, strap, case
            size) on the storefront.
          </p>

          <div className="flex items-center justify-between rounded-lg border bg-zinc-50 px-4 py-3">
            <div className="space-y-0.5">
              <Label htmlFor="p-featured" className="cursor-pointer">
                Featured product
              </Label>
              <p className="text-xs text-muted-foreground">
                Featured items appear in the Best Sellers rail on the homepage.
              </p>
            </div>
            <Switch
              id="p-featured"
              checked={form.featured}
              onCheckedChange={(v) => set("featured", v)}
            />
          </div>
        </div>

        {/* ------- Right: images ------- */}
        <div className="space-y-4 lg:col-span-2">
          <div className="space-y-2">
            <Label htmlFor="p-image">
              Main image URL <span className="text-destructive">*</span>
            </Label>
            <Input
              id="p-image"
              value={form.image}
              onChange={(e) => {
                set("image", e.target.value);
                setImgError(false);
              }}
              placeholder="https://…/photo.jpg or /uploads/photo.jpg"
              inputMode="url"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => mainFileRef.current?.click()}
              disabled={uploading}
              className="w-full h-10 gap-2"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Upload from your device
            </Button>
            <input
              ref={mainFileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              className="hidden"
              onChange={handleMainUpload}
            />
          </div>

          {/* Live preview */}
          <div className="overflow-hidden rounded-lg border bg-zinc-100">
            <div className="relative aspect-square w-full">
              {previewUrl ? (
                imgError ? (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center">
                    <AlertCircle className="h-8 w-8 text-destructive" />
                    <p className="text-sm text-muted-foreground">
                      Couldn&apos;t load this image. Check the URL or pick a
                      sample below.
                    </p>
                  </div>
                ) : (
                   
                  <img
                    src={previewUrl}
                    alt="Product preview"
                    className="h-full w-full object-cover"
                    onError={() => setImgError(true)}
                    onLoad={() => setImgError(false)}
                  />
                )
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-zinc-400">
                  <ImagePlus className="h-8 w-8" />
                  <p className="text-sm">Image preview</p>
                </div>
              )}
            </div>
          </div>

          {/* Gallery: multiple images per product */}
          <div className="space-y-2 rounded-lg border bg-zinc-50 p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                More images ({form.images.length}/8)
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 gap-1.5"
                disabled={uploading || form.images.length >= 8}
                onClick={() => galleryFileRef.current?.click()}
              >
                <Upload className="h-3.5 w-3.5" />
                Add images
              </Button>
              <input
                ref={galleryFileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                multiple
                className="hidden"
                onChange={handleGalleryUpload}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Upload extra shots from your device — customers see a gallery on
              the product page.
            </p>
            {form.images.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {form.images.map((url) => (
                  <div
                    key={url}
                    className="group relative aspect-square overflow-hidden rounded-md border bg-white"
                  >
                    { }
                    <img
                      src={url}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                    <button
                      type="button"
                      aria-label="Remove image"
                      onClick={() =>
                        set(
                          "images",
                          form.images.filter((u) => u !== url)
                        )
                      }
                      className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white opacity-90 hover:bg-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sample gallery */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Or pick a studio shot — {form.category}
            </p>
            <div className="grid grid-cols-5 gap-2">
              {samples.map((url) => {
                const active = form.image === url;
                return (
                  <button
                    key={url}
                    type="button"
                    onClick={() => {
                      set("image", url);
                      setImgError(false);
                    }}
                    aria-label="Use sample image"
                    className={`relative aspect-square overflow-hidden rounded-md border-2 transition-colors ${
                      active
                        ? "border-amber-600"
                        : "border-transparent hover:border-zinc-300"
                    }`}
                  >
                    { }
                    <img
                      src={url}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                    {active && (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <Check className="h-4 w-4 text-white" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Validation errors */}
      {errors.length > 0 && (
        <ul
          role="alert"
          className="space-y-1 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {errors.map((err) => (
            <li key={err} className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {err}
            </li>
          ))}
        </ul>
      )}

      {/* Actions */}
      <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={saving}
            className="sm:min-w-28"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={saving || uploading}
          className="bg-amber-600 hover:bg-amber-700 text-white sm:min-w-40"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEdit ? "Save changes" : "Add product"}
        </Button>
      </div>
    </form>
  );
}
