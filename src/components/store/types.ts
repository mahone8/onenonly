export type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  brand?: string | null;
  strap?: string | null;
  caseSize?: string | null;
  price: number;
  comparePrice: number | null;
  description: string;
  image: string;
  images: string[];
  badge: string | null;
  rating: number;
  reviews: number;
  stock: number;
  featured: boolean;
};

export type Category = { slug: string; name: string };

export const CATEGORIES = [
  { id: "all", label: "All Products" },
  { id: "caps", label: "Caps" },
  { id: "wallets", label: "Wallets" },
  { id: "bracelets", label: "Bracelets" },
  { id: "glasses", label: "Glasses" },
  { id: "watches", label: "Watches" },
] as const;

export const CATEGORY_IMAGES: Record<string, string> = {
  caps: "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/f67af5ff86f6.jpg",
  wallets:
    "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/d9b3cbaf6561.jpg",
  bracelets:
    "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/57f41d4fd1c0.jpg",
  glasses:
    "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/7d8ed9678635.png",
  watches:
    "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/79a6138f1c24.jpg",
};

export function categoryLabel(id: string) {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

/** Format PKR prices: Rs 9,390 (decimals only when needed). */
export function fmtPrice(n: number) {
  const hasCents = Math.round(n * 100) % 100 !== 0;
  const value = hasCents ? n.toFixed(2) : Math.round(n).toString();
  const [int, dec] = value.split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return dec ? `Rs ${grouped}.${dec}` : `Rs ${grouped}`;
}

/** Full gallery for a product: main image first, then extras, deduped. */
export function galleryOf(p: Pick<Product, "image" | "images">): string[] {
  const list = [p.image, ...(p.images ?? [])];
  return list.filter((url, i) => url && list.indexOf(url) === i);
}
