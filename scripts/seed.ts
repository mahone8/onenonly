import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const IMG = "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/";

type Seed = {
  slug: string;
  name: string;
  category: string;
  price: number;
  comparePrice?: number;
  description: string;
  image: string;
  badge?: string;
  rating: number;
  reviews: number;
  featured?: boolean;
};

const products: Seed[] = [
  // ---------------- CAPS ----------------
  {
    slug: "varsity-corduroy-cap",
    name: "Varsity Corduroy Cap",
    category: "caps",
    price: 34,
    comparePrice: 45,
    description:
      "A refined six-panel cap cut from soft corduroy with an adjustable metal clasp. Its structured crown and curved brim bring a quiet, editorial edge to any casual fit.",
    image: IMG + "f67af5ff86f6.jpg",
    badge: "BESTSELLER",
    rating: 4.9,
    reviews: 212,
    featured: true,
  },
  {
    slug: "retro-trucker-cap",
    name: "Retro Trucker Cap",
    category: "caps",
    price: 28,
    description:
      "Breathable mesh-back trucker with a classic foam front and snapback closure. Lightweight enough for all-day wear, styled after 80s road-trip classics.",
    image: IMG + "622caed40403.jpg",
    rating: 4.6,
    reviews: 143,
  },
  {
    slug: "highland-plaid-cap",
    name: "Highland Plaid Cap",
    category: "caps",
    price: 38,
    description:
      "Woven plaid pattern with a soft, unstructured silhouette that molds to your head over time. A countryside staple that pairs effortlessly with denim and wool coats.",
    image: IMG + "843f9959a964.png",
    rating: 4.7,
    reviews: 98,
  },
  {
    slug: "urban-bucket-hat",
    name: "Urban Bucket Hat",
    category: "caps",
    price: 32,
    comparePrice: 40,
    description:
      "A clean two-tone bucket hat in ripstop cotton with stitched side vents. Reversible-wear styling with all-round brim coverage for sun or street.",
    image: IMG + "9954e6929190.png",
    badge: "SALE",
    rating: 4.5,
    reviews: 176,
  },
  {
    slug: "weekend-duckbill-cap",
    name: "Weekend Duckbill Cap",
    category: "caps",
    price: 30,
    description:
      "Low-profile newsboy-inspired cap with a short duckbill brim. Cut from brushed cotton twill that softens with every wear — your everyday companion.",
    image: IMG + "2d5fa0e8006e.jpg",
    rating: 4.4,
    reviews: 87,
  },

  // ---------------- WALLETS ----------------
  {
    slug: "heritage-bifold-wallet",
    name: "Heritage Bifold Wallet",
    category: "wallets",
    price: 59,
    comparePrice: 79,
    description:
      "Full-grain leather bifold that develops a rich patina over the years. Eight card slots, two bill compartments and a slim 11mm profile when folded.",
    image: IMG + "d83450d3877e.jpg",
    badge: "BESTSELLER",
    rating: 4.9,
    reviews: 324,
    featured: true,
  },
  {
    slug: "saddle-tan-bifold",
    name: "Saddle Tan Bifold",
    category: "wallets",
    price: 64,
    description:
      "Vegetable-tanned in a warm saddle hue, this bifold is stitched with heavy waxed thread for lifetime durability. RFID-shielded lining keeps your cards safe.",
    image: IMG + "d9b3cbaf6561.jpg",
    rating: 4.8,
    reviews: 189,
    featured: true,
  },
  {
    slug: "metropolitan-long-clutch",
    name: "Metropolitan Long Clutch",
    category: "wallets",
    price: 72,
    description:
      "A zip-around long wallet for those who carry more. Twelve card slots, a coin pouch and phone-sized slip pocket, wrapped in pebbled espresso leather.",
    image: IMG + "03dc421a9e3a.jpg",
    rating: 4.7,
    reviews: 112,
  },
  {
    slug: "nomad-canvas-fold",
    name: "Nomad Canvas Fold",
    category: "wallets",
    price: 45,
    comparePrice: 55,
    description:
      "Waxed canvas shell with a leather interior — built for the traveler who wants tough and thin. Water-resistant, tear-proof and age-gracefully durable.",
    image: IMG + "30ab99495850.jpg",
    badge: "SALE",
    rating: 4.6,
    reviews: 95,
  },
  {
    slug: "executive-card-wallet",
    name: "Executive Card Wallet",
    category: "wallets",
    price: 39,
    description:
      "Minimalist card sleeve in smooth nappa leather holding up to 6 cards plus folded bills. Slips into a front pocket and disappears until you need it.",
    image: IMG + "0f32e1bb92eb.jpg",
    rating: 4.8,
    reviews: 267,
  },

  // ---------------- BRACELETS ----------------
  {
    slug: "rainbow-gem-bead-bracelet",
    name: "Rainbow Gem Bead Bracelet",
    category: "bracelets",
    price: 24,
    description:
      "Hand-strung multicolor gemstones on a double-knotted elastic core. Every stone is polished to a soft glow, so no two bracelets look exactly alike.",
    image: IMG + "57f41d4fd1c0.jpg",
    badge: "NEW",
    rating: 4.7,
    reviews: 76,
  },
  {
    slug: "boho-leather-stack",
    name: "Boho Leather Stack",
    category: "bracelets",
    price: 42,
    comparePrice: 56,
    description:
      "A pre-styled set of five leather and bead bracelets designed to layer together. Warm cognac tones with antique brass accents for an effortless wrist story.",
    image: IMG + "556e6f7566aa.jpg",
    badge: "SALE",
    rating: 4.8,
    reviews: 154,
    featured: true,
  },
  {
    slug: "gold-bar-chain-bracelet",
    name: "Gold Bar Chain Bracelet",
    category: "bracelets",
    price: 55,
    description:
      "A minimalist gold-tone bar on a fine rope chain with a lobster clasp. Subtle enough for the office, warm enough for golden-hour photos.",
    image: IMG + "b8816b11b49a.jpg",
    rating: 4.6,
    reviews: 88,
  },
  {
    slug: "chakra-lava-bead-bracelet",
    name: "Chakra Lava Bead Bracelet",
    category: "bracelets",
    price: 26,
    description:
      "Seven chakra stones separated by black lava rock that doubles as an essential-oil diffuser. Strung on durable stretch cord, fits most wrists.",
    image: IMG + "3ea67b37ec02.jpg",
    rating: 4.5,
    reviews: 131,
  },
  {
    slug: "pearl-leather-wrap",
    name: "Pearl & Leather Wrap",
    category: "bracelets",
    price: 38,
    description:
      "Freshwater-look pearls hand-stitched onto soft navy leather that wraps twice around the wrist. Coastal charm meets everyday durability.",
    image: IMG + "7a0ee21cefea.jpg",
    rating: 4.7,
    reviews: 64,
  },

  // ---------------- GLASSES ----------------
  {
    slug: "midnight-wayfarer",
    name: "Midnight Wayfarer",
    category: "glasses",
    price: 89,
    comparePrice: 120,
    description:
      "Matte-black acetate frames with polarized smoke-grey lenses. A modern take on the wayfarer icon — bold in the sun, invisible at night.",
    image: IMG + "7d8ed9678635.png",
    badge: "BESTSELLER",
    rating: 4.9,
    reviews: 287,
    featured: true,
  },
  {
    slug: "golden-hour-aviator",
    name: "Golden Hour Aviator",
    category: "glasses",
    price: 95,
    description:
      "Featherlight metal aviators with a warm gold finish and gradient amber lenses. Built for coastline drives and rooftop evenings.",
    image: IMG + "f15da1d3c7bf.jpg",
    rating: 4.8,
    reviews: 165,
    featured: true,
  },
  {
    slug: "riviera-poolside-shades",
    name: "Riviera Poolside Shades",
    category: "glasses",
    price: 68,
    description:
      "Retro square frames in honey tortoise with UV400 protection. Splash-friendly, salt-air approved and made for long afternoons by the water.",
    image: IMG + "3b5665db8498.jpg",
    rating: 4.5,
    reviews: 92,
  },
  {
    slug: "scholar-round-frames",
    name: "Scholar Round Frames",
    category: "glasses",
    price: 75,
    description:
      "Slim round silhouette with keyhole bridge in polished onyx. Blue-light variant available — as easy with a book as with a boardroom screen.",
    image: IMG + "889ece7701ec.jpg",
    badge: "NEW",
    rating: 4.6,
    reviews: 78,
  },
  {
    slug: "noir-cat-eye-sunglasses",
    name: "Noir Cat-Eye Sunglasses",
    category: "glasses",
    price: 82,
    comparePrice: 98,
    description:
      "Sculpted cat-eye frame with a high-gloss black finish and gradient smoke lenses. A sharp, face-framing cut that elevates any look instantly.",
    image: IMG + "c9341d2b16c9.jpg",
    rating: 4.7,
    reviews: 119,
  },

  // ---------------- WATCHES ----------------
  {
    slug: "emerald-dial-automatic",
    name: "Emerald Dial Automatic",
    category: "watches",
    price: 249,
    comparePrice: 320,
    description:
      "Self-winding automatic movement with a sunburst emerald dial, sapphire crystal and 100m water resistance. Stainless case on a solid-link bracelet.",
    image: IMG + "79a6138f1c24.jpg",
    badge: "BESTSELLER",
    rating: 4.9,
    reviews: 203,
    featured: true,
  },
  {
    slug: "milanese-mesh-chronograph",
    name: "Milanese Mesh Chronograph",
    category: "watches",
    price: 189,
    description:
      "Square-cased chronograph on a breathable Milanese mesh strap. Champagne indices, three sub-dials and a magnetic clasp for micro-adjustment.",
    image: IMG + "0e788ab2cc26.jpg",
    rating: 4.7,
    reviews: 141,
    featured: true,
  },
  {
    slug: "onyx-steel-diver",
    name: "Onyx Steel Diver",
    category: "watches",
    price: 215,
    description:
      "A tool-watch DNA diver with a blacked-out bracelet, luminous hands and a unidirectional bezel. Rugged on the wrist, refined under a cuff.",
    image: IMG + "020334db9208.jpg",
    rating: 4.8,
    reviews: 178,
  },
  {
    slug: "tideline-field-watch",
    name: "Tideline Field Watch",
    category: "watches",
    price: 165,
    comparePrice: 199,
    description:
      "Inspired by driftwood and tide charts — a warm bronze case on a weathered leather strap with an ultra-legible sand-colored dial.",
    image: IMG + "8823294d7d74.jpeg",
    badge: "SALE",
    rating: 4.6,
    reviews: 96,
  },
  {
    slug: "crimson-chronograph",
    name: "Crimson Chronograph",
    category: "watches",
    price: 279,
    description:
      "A statement racing chronograph with a lacquered crimson dial and tachymeter bezel. Bold color, precise quartz heart, unmistakable on the wrist.",
    image: IMG + "84f2ac745b3f.jpg",
    badge: "NEW",
    rating: 4.7,
    reviews: 73,
  },
];

async function main() {
  const count = await db.product.count();
  if (count > 0) {
    console.log(`DB already seeded with ${count} products. Skipping.`);
    return;
  }
  for (const p of products) {
    await db.product.create({ data: p });
  }
  console.log(`Seeded ${products.length} products.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
