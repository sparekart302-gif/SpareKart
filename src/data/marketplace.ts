// SpareKart mock data — Pakistan-first auto parts marketplace

export type Category = {
  slug: string;
  name: string;
  icon: string;
  description: string;
  productCount: number;
};

export type Brand = { slug: string; name: string };

export type Vehicle = { brand: string; models: { name: string; years: number[]; engines: string[] }[] };

export type Seller = {
  slug: string;
  name: string;
  tagline: string;
  logo: string;
  banner: string;
  rating: number;
  reviewCount: number;
  productCount: number;
  city: string;
  joined: string;
  verified: boolean;
  responseTime: string;
  description: string;
  policies: { returns: string; shipping: string; warranty: string };
};

export type Product = {
  id: string;
  slug: string;
  title: string;
  brand: string;
  category: string;
  sku: string;
  price: number;
  comparePrice?: number;
  images: string[];
  sellerSlug: string;
  rating: number;
  reviewCount: number;
  stock: number;
  badge?: "best-seller" | "new" | "deal" | "fast-shipping";
  compatibility: { brand: string; model: string; years: number[] }[];
  shortDescription: string;
  description: string;
  specs: { label: string; value: string }[];
  tags: string[];
};

export type ProductReview = {
  id: string;
  productId: string;
  author: string;
  rating: number;
  date: string;
  title: string;
  body: string;
  fitment: number; // 1-5
  quality: number;
  value: number;
  verified: boolean;
};

export type StoreReview = {
  id: string;
  sellerSlug: string;
  author: string;
  rating: number;
  date: string;
  title: string;
  body: string;
  service: number;
  delivery: number;
  communication: number;
};

export const categories: Category[] = [
  { slug: "brakes", name: "Brakes", icon: "Disc", description: "Pads, rotors, calipers & brake fluids", productCount: 412 },
  { slug: "engine", name: "Engine", icon: "Cog", description: "Filters, belts, gaskets & engine parts", productCount: 638 },
  { slug: "suspension", name: "Suspension", icon: "Activity", description: "Shocks, struts, bushings & control arms", productCount: 287 },
  { slug: "lighting", name: "Lighting", icon: "Lightbulb", description: "Headlights, tail lamps, LED bulbs & fog", productCount: 354 },
  { slug: "electrical", name: "Electrical", icon: "Zap", description: "Batteries, alternators, starters & wiring", productCount: 521 },
  { slug: "body", name: "Body & Exterior", icon: "Car", description: "Bumpers, mirrors, panels & trims", productCount: 198 },
  { slug: "interior", name: "Interior", icon: "Armchair", description: "Floor mats, seat covers & dashboard", productCount: 246 },
  { slug: "tyres-wheels", name: "Tyres & Wheels", icon: "CircleDot", description: "Tyres, alloy wheels & accessories", productCount: 312 },
];

export const brands: Brand[] = [
  { slug: "bosch", name: "Bosch" },
  { slug: "denso", name: "Denso" },
  { slug: "ngk", name: "NGK" },
  { slug: "brembo", name: "Brembo" },
  { slug: "kyb", name: "KYB" },
  { slug: "exide", name: "Exide" },
  { slug: "philips", name: "Philips" },
  { slug: "valeo", name: "Valeo" },
  { slug: "mobil", name: "Mobil 1" },
  { slug: "shell", name: "Shell" },
];

export const vehicles: Vehicle[] = [
  {
    brand: "Toyota",
    models: [
      { name: "Corolla", years: [2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024], engines: ["1.3L", "1.6L", "1.8L"] },
      { name: "Yaris", years: [2020, 2021, 2022, 2023, 2024], engines: ["1.3L", "1.5L"] },
      { name: "Hilux", years: [2016, 2018, 2020, 2022, 2024], engines: ["2.8L Diesel"] },
      { name: "Fortuner", years: [2018, 2020, 2022, 2024], engines: ["2.7L", "2.8L Diesel"] },
    ],
  },
  {
    brand: "Honda",
    models: [
      { name: "Civic", years: [2016, 2018, 2020, 2022, 2024], engines: ["1.5L Turbo", "1.8L"] },
      { name: "City", years: [2017, 2019, 2021, 2022, 2024], engines: ["1.2L", "1.5L"] },
      { name: "BR-V", years: [2018, 2020, 2022], engines: ["1.5L"] },
    ],
  },
  {
    brand: "Suzuki",
    models: [
      { name: "Mehran", years: [2010, 2014, 2018, 2019], engines: ["800cc"] },
      { name: "Alto", years: [2019, 2020, 2021, 2022, 2023, 2024], engines: ["660cc"] },
      { name: "Cultus", years: [2017, 2019, 2021, 2023], engines: ["1.0L"] },
      { name: "Wagon R", years: [2014, 2018, 2021, 2023], engines: ["1.0L"] },
      { name: "Swift", years: [2010, 2018, 2022, 2024], engines: ["1.3L"] },
    ],
  },
  {
    brand: "Hyundai",
    models: [
      { name: "Tucson", years: [2020, 2022, 2024], engines: ["2.0L"] },
      { name: "Elantra", years: [2021, 2023], engines: ["2.0L"] },
      { name: "Sonata", years: [2021, 2023], engines: ["2.5L"] },
    ],
  },
  {
    brand: "KIA",
    models: [
      { name: "Sportage", years: [2019, 2021, 2023, 2024], engines: ["2.0L"] },
      { name: "Picanto", years: [2019, 2021, 2023], engines: ["1.0L"] },
      { name: "Stonic", years: [2021, 2023], engines: ["1.4L"] },
    ],
  },
];

const placeholder = (seed: string, w = 600, h = 600) =>
  `https://images.unsplash.com/${seed}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;

const productImages = [
  "photo-1486262715619-67b85e0b08d3", // engine
  "photo-1487754180451-c456f719a1fc", // brake
  "photo-1503376780353-7e6692767b70", // car
  "photo-1492144534655-ae79c964c9d7", // headlight
  "photo-1542362567-b07e54358753", // wheel
  "photo-1493238792000-8113da705763", // tools
  "photo-1558981806-ec527fa84c39", // engine bay
  "photo-1632823469850-2f77dd9c7f93", // car part
  "photo-1599256871679-d39844b1b1ad", // tyre
  "photo-1605559424843-9e4c228bf1c2", // mechanic
];

const sellerLogos = [
  "photo-1611162617474-5b21e879e113",
  "photo-1599305445671-ac291c95aaa9",
  "photo-1572177812156-58036aae439c",
  "photo-1606107557195-0e29a4b5b4aa",
  "photo-1555529669-e69e7aa0ba9a",
  "photo-1614026480209-cbb20292e3c5",
  "photo-1518770660439-4636190af475",
  "photo-1607082348824-0a96f2a4b9da",
];

const sellerBanners = [
  "photo-1492144534655-ae79c964c9d7",
  "photo-1503376780353-7e6692767b70",
  "photo-1486262715619-67b85e0b08d3",
  "photo-1542362567-b07e54358753",
  "photo-1605559424843-9e4c228bf1c2",
  "photo-1493238792000-8113da705763",
  "photo-1487754180451-c456f719a1fc",
  "photo-1558981806-ec527fa84c39",
];

export const sellers: Seller[] = [
  {
    slug: "auto-pro-karachi",
    name: "AutoPro Karachi",
    tagline: "Genuine OEM parts since 2008",
    logo: placeholder(sellerLogos[0], 200, 200),
    banner: placeholder(sellerBanners[0], 1600, 400),
    rating: 4.8, reviewCount: 1248, productCount: 342,
    city: "Karachi", joined: "2018-03-12", verified: true, responseTime: "Within 2 hours",
    description: "AutoPro Karachi is a trusted name in genuine OEM auto parts. We stock parts for all major Japanese, Korean and European cars with same-day dispatch across Pakistan.",
    policies: { returns: "7-day easy returns", shipping: "Free shipping over Rs. 5,000", warranty: "6-month warranty on all parts" },
  },
  {
    slug: "lahore-spare-hub",
    name: "Lahore Spare Hub",
    tagline: "Your one-stop spare parts destination",
    logo: placeholder(sellerLogos[1], 200, 200),
    banner: placeholder(sellerBanners[1], 1600, 400),
    rating: 4.7, reviewCount: 892, productCount: 421,
    city: "Lahore", joined: "2019-07-22", verified: true, responseTime: "Within 4 hours",
    description: "Specialists in suspension, brakes and engine parts. Authorised dealer for Bosch, KYB and Brembo in Punjab region.",
    policies: { returns: "10-day returns", shipping: "Nationwide delivery", warranty: "Manufacturer warranty applies" },
  },
  {
    slug: "islamabad-motors",
    name: "Islamabad Motors Parts",
    tagline: "Premium parts, professional service",
    logo: placeholder(sellerLogos[2], 200, 200),
    banner: placeholder(sellerBanners[2], 1600, 400),
    rating: 4.9, reviewCount: 567, productCount: 189,
    city: "Islamabad", joined: "2020-01-15", verified: true, responseTime: "Within 1 hour",
    description: "Curated selection of premium European and Japanese parts. Expert advice and certified technicians on staff.",
    policies: { returns: "14-day returns", shipping: "Same-day in twin cities", warranty: "1-year warranty" },
  },
  {
    slug: "shahrah-auto-parts",
    name: "Shahrah Auto Parts",
    tagline: "Quality you can trust",
    logo: placeholder(sellerLogos[3], 200, 200),
    banner: placeholder(sellerBanners[3], 1600, 400),
    rating: 4.6, reviewCount: 1834, productCount: 612,
    city: "Karachi", joined: "2017-05-08", verified: true, responseTime: "Within 3 hours",
    description: "Largest spare parts inventory in Karachi. Wholesale and retail with COD across Pakistan.",
    policies: { returns: "7-day returns", shipping: "Pan-Pakistan delivery", warranty: "30-day defect warranty" },
  },
  {
    slug: "punjab-spare-mart",
    name: "Punjab Spare Mart",
    tagline: "Honest pricing, original parts",
    logo: placeholder(sellerLogos[4], 200, 200),
    banner: placeholder(sellerBanners[4], 1600, 400),
    rating: 4.5, reviewCount: 723, productCount: 287,
    city: "Faisalabad", joined: "2019-11-03", verified: true, responseTime: "Within 6 hours",
    description: "Family-run business serving Faisalabad and central Punjab for over 15 years.",
    policies: { returns: "5-day returns", shipping: "Free over Rs. 3,000", warranty: "As per manufacturer" },
  },
  {
    slug: "rawalpindi-engine-house",
    name: "Rawalpindi Engine House",
    tagline: "Engine specialists since 2005",
    logo: placeholder(sellerLogos[5], 200, 200),
    banner: placeholder(sellerBanners[5], 1600, 400),
    rating: 4.7, reviewCount: 456, productCount: 156,
    city: "Rawalpindi", joined: "2020-08-19", verified: true, responseTime: "Within 2 hours",
    description: "Engine parts specialists with focus on Toyota, Honda and Suzuki vehicles.",
    policies: { returns: "10-day returns", shipping: "Express courier", warranty: "6 months" },
  },
  {
    slug: "multan-auto-zone",
    name: "Multan Auto Zone",
    tagline: "Southern Punjab's biggest range",
    logo: placeholder(sellerLogos[6], 200, 200),
    banner: placeholder(sellerBanners[6], 1600, 400),
    rating: 4.4, reviewCount: 389, productCount: 234,
    city: "Multan", joined: "2021-02-11", verified: true, responseTime: "Within 8 hours",
    description: "Serving Multan and southern Punjab with a wide range of parts at honest prices.",
    policies: { returns: "7-day returns", shipping: "Standard delivery", warranty: "Per manufacturer" },
  },
  {
    slug: "peshawar-parts-centre",
    name: "Peshawar Parts Centre",
    tagline: "KP's most trusted parts dealer",
    logo: placeholder(sellerLogos[7], 200, 200),
    banner: placeholder(sellerBanners[7], 1600, 400),
    rating: 4.6, reviewCount: 512, productCount: 198,
    city: "Peshawar", joined: "2019-04-27", verified: true, responseTime: "Within 4 hours",
    description: "KP region's premier auto parts destination with specialty in 4x4 and SUV parts.",
    policies: { returns: "7-day returns", shipping: "Nationwide", warranty: "6-month warranty" },
  },
];

const productNames = [
  { title: "Bosch Front Brake Pads Set", category: "brakes", brand: "Bosch", price: 4850, compare: 5800 },
  { title: "Brembo High-Performance Brake Rotors", category: "brakes", brand: "Brembo", price: 18500, compare: 22000 },
  { title: "Brake Caliper Assembly OEM", category: "brakes", brand: "Bosch", price: 12400 },
  { title: "DOT-4 Brake Fluid 500ml", category: "brakes", brand: "Bosch", price: 850, compare: 1100 },
  { title: "Denso Oil Filter — Premium", category: "engine", brand: "Denso", price: 1250, compare: 1500 },
  { title: "NGK Iridium Spark Plugs (Set of 4)", category: "engine", brand: "NGK", price: 3200, compare: 3800 },
  { title: "Engine Air Filter — High Flow", category: "engine", brand: "Bosch", price: 2150 },
  { title: "Timing Belt Kit Complete", category: "engine", brand: "Denso", price: 8400, compare: 9800 },
  { title: "Mobil 1 Full Synthetic 5W-30 (4L)", category: "engine", brand: "Mobil 1", price: 9200, compare: 10500 },
  { title: "Engine Mount — Front", category: "engine", brand: "Denso", price: 4600 },
  { title: "KYB Excel-G Shock Absorbers (Pair)", category: "suspension", brand: "KYB", price: 14800, compare: 17200 },
  { title: "Strut Assembly Front Right", category: "suspension", brand: "KYB", price: 11200 },
  { title: "Lower Control Arm with Bushings", category: "suspension", brand: "Valeo", price: 6800, compare: 8200 },
  { title: "Stabilizer Link — Heavy Duty", category: "suspension", brand: "KYB", price: 1850 },
  { title: "Philips H4 Crystal Vision LED Headlights", category: "lighting", brand: "Philips", price: 5400, compare: 6800 },
  { title: "LED Tail Light Assembly", category: "lighting", brand: "Valeo", price: 8900 },
  { title: "Fog Lamp Set with Wiring Harness", category: "lighting", brand: "Philips", price: 4200, compare: 5000 },
  { title: "Interior Dome Light LED Conversion", category: "lighting", brand: "Philips", price: 1450 },
  { title: "Exide Maintenance-Free Battery 65Ah", category: "electrical", brand: "Exide", price: 18500, compare: 21000 },
  { title: "Bosch Alternator 90A Reconditioned", category: "electrical", brand: "Bosch", price: 14200 },
  { title: "Starter Motor Assembly OEM", category: "electrical", brand: "Denso", price: 16800, compare: 19500 },
  { title: "Ignition Coil Pack (Set of 4)", category: "electrical", brand: "NGK", price: 7200 },
  { title: "Wiring Harness Repair Kit", category: "electrical", brand: "Bosch", price: 2400 },
  { title: "Front Bumper Cover OEM", category: "body", brand: "Valeo", price: 22500, compare: 26000 },
  { title: "Side View Mirror with Indicator", category: "body", brand: "Valeo", price: 6400 },
  { title: "Door Handle Chrome Finish (Set)", category: "body", brand: "Valeo", price: 3800, compare: 4500 },
  { title: "Hood Strut Gas Springs (Pair)", category: "body", brand: "KYB", price: 2200 },
  { title: "Premium All-Weather Floor Mats Set", category: "interior", brand: "Valeo", price: 4800, compare: 5800 },
  { title: "Leather Seat Cover Set Universal", category: "interior", brand: "Valeo", price: 8900 },
  { title: "Dashboard Cover — UV Resistant", category: "interior", brand: "Valeo", price: 2400, compare: 3000 },
  { title: "Steering Wheel Cover Premium Leather", category: "interior", brand: "Valeo", price: 1800 },
  { title: "All-Season Tyre 195/65R15", category: "tyres-wheels", brand: "Bosch", price: 12800, compare: 14500 },
  { title: "Performance Tyre 205/55R16", category: "tyres-wheels", brand: "Bosch", price: 16400 },
  { title: "Alloy Wheel 16\" Sport Design", category: "tyres-wheels", brand: "Valeo", price: 22500, compare: 26800 },
  { title: "Wheel Hub Bearing Assembly", category: "tyres-wheels", brand: "KYB", price: 5200 },
  { title: "Tyre Pressure Sensor TPMS", category: "tyres-wheels", brand: "Bosch", price: 3400, compare: 4000 },
  { title: "Lug Nut Set Chrome (20pcs)", category: "tyres-wheels", brand: "Valeo", price: 1200 },
  { title: "Cabin Air Filter Activated Carbon", category: "engine", brand: "Bosch", price: 1650, compare: 2000 },
  { title: "Radiator Coolant 4L Concentrate", category: "engine", brand: "Shell", price: 1850 },
  { title: "Wiper Blade Set Premium 22\"+18\"", category: "body", brand: "Bosch", price: 2100, compare: 2600 },
];

const sample = <T,>(arr: T[], i: number) => arr[i % arr.length];

const allCompat: Product["compatibility"][number][] = [];
vehicles.forEach((v) =>
  v.models.forEach((m) => allCompat.push({ brand: v.brand, model: m.name, years: m.years })),
);

export const products: Product[] = productNames.map((p, i) => {
  const slug = p.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const sellerSlug = sellers[i % sellers.length].slug;
  const compatCount = 2 + (i % 3);
  const compat = Array.from({ length: compatCount }, (_, j) => allCompat[(i * 3 + j) % allCompat.length]);
  const stock = i % 11 === 0 ? 0 : i % 7 === 0 ? 3 : 12 + (i % 40);
  const badges: Product["badge"][] = ["best-seller", "new", "deal", "fast-shipping", undefined, undefined];
  return {
    id: `prod-${i + 1}`,
    slug: `${slug}-${i + 1}`,
    title: p.title,
    brand: p.brand,
    category: p.category,
    sku: `SK-${(10000 + i).toString()}`,
    price: p.price,
    comparePrice: p.compare,
    images: [
      placeholder(sample(productImages, i), 800, 800),
      placeholder(sample(productImages, i + 1), 800, 800),
      placeholder(sample(productImages, i + 2), 800, 800),
      placeholder(sample(productImages, i + 3), 800, 800),
    ],
    sellerSlug,
    rating: 3.8 + ((i * 7) % 12) / 10,
    reviewCount: 12 + ((i * 13) % 280),
    stock,
    badge: badges[i % badges.length],
    compatibility: compat,
    shortDescription: `${p.title} — engineered for precise fitment and long-lasting performance. Backed by ${p.brand} quality and verified seller warranty.`,
    description: `Genuine ${p.brand} ${p.title.toLowerCase()} built to OEM specifications. Each unit is quality-checked and tested for performance, durability and exact-fit installation. Suitable for daily driving and demanding conditions across Pakistan.\n\nIncludes installation guide and manufacturer warranty. Sourced directly from authorised distributors.`,
    specs: [
      { label: "Brand", value: p.brand },
      { label: "SKU", value: `SK-${10000 + i}` },
      { label: "Material", value: i % 2 ? "OEM Grade Steel" : "Reinforced Composite" },
      { label: "Country of Origin", value: i % 3 === 0 ? "Japan" : i % 3 === 1 ? "Germany" : "Korea" },
      { label: "Warranty", value: "6 months" },
      { label: "Box Contents", value: "1 × Part, Installation guide" },
    ],
    tags: [p.category, p.brand.toLowerCase(), "genuine"],
  };
});

const reviewAuthors = [
  "Ahmed K.", "Fatima R.", "Bilal M.", "Sana A.", "Hassan I.",
  "Ayesha N.", "Usman T.", "Zara S.", "Imran H.", "Hira K.",
];

export const productReviews: ProductReview[] = products.flatMap((p) =>
  Array.from({ length: 3 }, (_, j) => ({
    id: `${p.id}-r${j}`,
    productId: p.id,
    author: reviewAuthors[(parseInt(p.id.split("-")[1]) + j) % reviewAuthors.length],
    rating: [5, 4, 5, 4, 3, 5][(j + parseInt(p.id.split("-")[1])) % 6],
    date: ["2 days ago", "1 week ago", "2 weeks ago", "1 month ago"][j % 4],
    title: ["Perfect fit!", "Great value", "Highly recommended", "Excellent quality", "Worth every rupee"][j % 5],
    body: "Fitted on my car without any modifications. Quality feels premium, packaging was secure, and seller communicated promptly throughout. Would definitely buy from again.",
    fitment: 4 + (j % 2),
    quality: 4 + ((j + 1) % 2),
    value: 4 + ((j + 2) % 2),
    verified: true,
  })),
);

export const storeReviews: StoreReview[] = sellers.flatMap((s) =>
  Array.from({ length: 4 }, (_, j) => ({
    id: `${s.slug}-r${j}`,
    sellerSlug: s.slug,
    author: reviewAuthors[j % reviewAuthors.length],
    rating: [5, 5, 4, 5][j],
    date: ["3 days ago", "1 week ago", "2 weeks ago", "1 month ago"][j],
    title: ["Top-notch service", "Fast shipping", "Very responsive", "Trustworthy seller"][j],
    body: "Ordered on Saturday, received Monday morning. Item was exactly as described, packaged well and the seller answered all my fitment questions before purchase. Will return.",
    service: 4 + (j % 2),
    delivery: 5,
    communication: 4 + ((j + 1) % 2),
  })),
);

export const formatPKR = (n: number) =>
  `Rs. ${n.toLocaleString("en-PK")}`;

export const getSeller = (slug: string) => sellers.find((s) => s.slug === slug)!;
export const getProduct = (slug: string) => products.find((p) => p.slug === slug);
export const getProductsBySeller = (slug: string) => products.filter((p) => p.sellerSlug === slug);
export const getProductsByCategory = (slug: string) => products.filter((p) => p.category === slug);

export const trustPillars = [
  { icon: "ShieldCheck", title: "Verified Sellers", description: "Every store is vetted and trust-rated" },
  { icon: "Banknote", title: "Cash on Delivery", description: "Pay only when your order arrives" },
  { icon: "RotateCcw", title: "Easy Returns", description: "7-day hassle-free return policy" },
  { icon: "BadgeCheck", title: "Fitment Guarantee", description: "Wrong part? Free replacement, always" },
];

export type CartLine = { productId: string; qty: number };

export const sampleCart: CartLine[] = [
  { productId: "prod-1", qty: 2 },
  { productId: "prod-5", qty: 1 },
  { productId: "prod-19", qty: 1 },
  { productId: "prod-15", qty: 1 },
];