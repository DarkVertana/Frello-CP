import "./env";
import { db } from "./index";
import { blogs, categories, diseases, products, settings, supplements } from "./schema";

/**
 * Development seed for Plant+.
 *
 * The full datasets — products, the 39 PlantVillage diseases, and supplements —
 * are owned by the mobile app repo. Drop the exported JSON into:
 *
 *   data/seed/categories.json
 *   data/seed/products.json
 *   data/seed/supplements.json
 *   data/seed/diseases.json
 *
 * mirroring the field shapes defined in the mobile app's
 *   - src/constants/home-data.ts (Product, Category)
 *   - src/ml/plant-disease-data.ts (LeafInfo + 39 labels)
 *
 * Until those land, this script seeds a minimal set so the admin dashboard
 * boots with usable data.
 */
async function seed() {
  console.log("Seeding Plant+ dev database…");

  // --- Categories ---------------------------------------------------------
  await db
    .insert(categories)
    .values([
      { name: "Seeds", slug: "seeds", icon: "sprout", order: 0, description: "Vegetable, herb & flower seeds." },
      { name: "Fertilizers", slug: "fertilizers", icon: "leaf", order: 1, description: "Organic & mineral plant nutrition." },
      { name: "Pesticides", slug: "pesticides", icon: "spray-can", order: 2, description: "Pest, insect & disease control." },
      { name: "Soil", slug: "soil", icon: "shovel", order: 3, description: "Potting mixes, cocopeat & amendments." },
      { name: "Irrigation", slug: "irrigation", icon: "droplets", order: 4, description: "Watering cans, hoses & drip systems." },
      { name: "Tools & Equipment", slug: "tools", icon: "wrench", order: 5, description: "Hand tools & garden gear." },
      { name: "Growth Boosters", slug: "growth-boosters", icon: "flask", order: 6, description: "Hormones, micronutrients & tonics." },
      { name: "Pots & Planters", slug: "pots", icon: "box", order: 7, description: "Pots, grow bags & planters." },
    ])
    .onConflictDoNothing();

  // --- Products -----------------------------------------------------------
  // A starter agri catalog across categories. Prices are integer paise
  // (1 INR = 100 paise). Images are keyword-matched Creative-Commons photos
  // (loremflickr) — replace with real product shots in the admin (Cloudinary).
  const catRows = await db
    .select({ id: categories.id, slug: categories.slug })
    .from(categories);
  const catId = Object.fromEntries(catRows.map((c) => [c.slug, c.id]));

  /** Real CC photo by keyword; `lock` keeps the same image each run. */
  const img = (keywords: string, lock: number) =>
    `https://loremflickr.com/640/640/${keywords}?lock=${lock}`;

  type SeedProduct = {
    name: string;
    slug: string;
    category: string;
    price: number;
    originalPrice?: number;
    rating: number;
    reviewsCount: number;
    stock: number;
    servesPerPerson?: string;
    keywords: string;
    lock: number;
    accent: string;
    description: string;
  };

  const accent: Record<string, string> = {
    seeds: "#138A4C",
    fertilizers: "#6B8E23",
    pesticides: "#2E7D32",
    soil: "#8B5E34",
    irrigation: "#1565C0",
    tools: "#455A64",
    "growth-boosters": "#00897B",
    pots: "#C2632E",
  };

  const catalog: SeedProduct[] = [
    // Seeds
    { name: "Hybrid Tomato Seeds (F1)", slug: "hybrid-tomato-seeds-f1", category: "seeds", price: 4900, originalPrice: 6900, rating: 4.5, reviewsCount: 128, stock: 240, servesPerPerson: "20–25 plants", keywords: "tomato,seeds", lock: 11, accent: accent.seeds, description: "High-yield F1 hybrid with strong disease resistance. ~85 days to first harvest." },
    { name: "Coriander (Dhania) Seeds 100g", slug: "coriander-seeds-100g", category: "seeds", price: 3500, rating: 4.3, reviewsCount: 64, stock: 300, servesPerPerson: "Covers ~10 sq.m", keywords: "coriander,seeds", lock: 12, accent: accent.seeds, description: "Aromatic, fast-germinating coriander for fresh kitchen-garden harvests." },
    { name: "Marigold Flower Seeds", slug: "marigold-flower-seeds", category: "seeds", price: 2900, originalPrice: 3900, rating: 4.6, reviewsCount: 92, stock: 180, servesPerPerson: "30–40 plants", keywords: "marigold,flower", lock: 13, accent: accent.seeds, description: "Bright African marigold — great for borders and natural pest deterrence." },
    { name: "Okra (Bhindi) Seeds 50g", slug: "okra-bhindi-seeds-50g", category: "seeds", price: 4500, rating: 4.4, reviewsCount: 51, stock: 150, servesPerPerson: "15–20 plants", keywords: "okra,plant", lock: 14, accent: accent.seeds, description: "Tender, high-yielding okra variety suited to warm Indian summers." },
    // Fertilizers
    { name: "Organic Vermicompost 5kg", slug: "organic-vermicompost-5kg", category: "fertilizers", price: 29900, rating: 4.7, reviewsCount: 86, stock: 60, servesPerPerson: "5–6 plants/month", keywords: "compost,soil", lock: 21, accent: accent.fertilizers, description: "Nutrient-rich earthworm castings that improve soil structure and water retention." },
    { name: "NPK 19:19:19 Water Soluble 1kg", slug: "npk-19-19-19-1kg", category: "fertilizers", price: 39900, originalPrice: 45900, rating: 4.6, reviewsCount: 140, stock: 90, servesPerPerson: "Makes ~200 L", keywords: "fertilizer,granules", lock: 22, accent: accent.fertilizers, description: "Balanced fully water-soluble fertilizer for vigorous all-stage growth." },
    { name: "Bone Meal Fertilizer 1kg", slug: "bone-meal-fertilizer-1kg", category: "fertilizers", price: 24900, rating: 4.4, reviewsCount: 38, stock: 70, servesPerPerson: "8–10 pots", keywords: "fertilizer,powder", lock: 23, accent: accent.fertilizers, description: "Slow-release phosphorus and calcium for strong roots and abundant blooms." },
    { name: "Seaweed Extract Liquid 500ml", slug: "seaweed-extract-500ml", category: "fertilizers", price: 34900, rating: 4.8, reviewsCount: 110, stock: 80, servesPerPerson: "Makes ~100 L", keywords: "seaweed,bottle", lock: 24, accent: accent.fertilizers, description: "Bio-stimulant rich in growth hormones and trace minerals for healthier plants." },
    // Pesticides
    { name: "Neem Oil Spray 500ml", slug: "neem-oil-spray-500ml", category: "pesticides", price: 34900, rating: 4.6, reviewsCount: 152, stock: 120, servesPerPerson: "Ready to use", keywords: "neem,spray", lock: 31, accent: accent.pesticides, description: "Ready-to-use botanical spray for aphids, mites, whitefly, and common fungal issues." },
    { name: "Organic Pesticide (Neem-Karanj) 1L", slug: "organic-pesticide-neem-karanj-1l", category: "pesticides", price: 44900, originalPrice: 52000, rating: 4.5, reviewsCount: 73, stock: 60, servesPerPerson: "Makes ~200 L", keywords: "pesticide,bottle", lock: 32, accent: accent.pesticides, description: "Concentrated cold-pressed neem + karanja oil for organic pest management." },
    { name: "Yellow Sticky Traps (10-pack)", slug: "yellow-sticky-traps-10pack", category: "pesticides", price: 19900, rating: 4.3, reviewsCount: 95, stock: 200, servesPerPerson: "10 plants", keywords: "insect,trap", lock: 33, accent: accent.pesticides, description: "Chemical-free traps that catch whitefly, aphids, and fungus gnats." },
    { name: "Bordeaux Mixture Fungicide 500g", slug: "bordeaux-fungicide-500g", category: "pesticides", price: 27900, rating: 4.2, reviewsCount: 41, stock: 55, servesPerPerson: "Makes ~50 L", keywords: "fungicide,powder", lock: 34, accent: accent.pesticides, description: "Classic copper-based fungicide for blight, leaf spot, and downy mildew." },
    // Soil
    { name: "Cocopeat Block 5kg", slug: "cocopeat-block-5kg", category: "soil", price: 19900, originalPrice: 24900, rating: 4.3, reviewsCount: 41, stock: 8, servesPerPerson: "~75 L medium", keywords: "coir,coconut", lock: 41, accent: accent.soil, description: "Expands to ~75 L of growing medium. Great for seed starting and container mixes." },
    { name: "Ready Potting Mix 10kg", slug: "ready-potting-mix-10kg", category: "soil", price: 39900, rating: 4.6, reviewsCount: 130, stock: 100, servesPerPerson: "10–12 pots", keywords: "potting,soil", lock: 42, accent: accent.soil, description: "Pre-mixed, well-draining blend of cocopeat, compost, and perlite — ready to pot." },
    { name: "Perlite 5L", slug: "perlite-5l", category: "soil", price: 22900, rating: 4.4, reviewsCount: 28, stock: 75, servesPerPerson: "Soil amendment", keywords: "perlite,soil", lock: 43, accent: accent.soil, description: "Lightweight volcanic mineral that boosts aeration and drainage in any mix." },
    { name: "Garden Red Soil 10kg", slug: "garden-red-soil-10kg", category: "soil", price: 14900, rating: 4.1, reviewsCount: 33, stock: 120, servesPerPerson: "Base medium", keywords: "soil,garden", lock: 44, accent: accent.soil, description: "Screened, sun-dried red soil — the everyday base for beds and containers." },
    // Irrigation
    { name: "Drip Irrigation Starter Kit", slug: "drip-irrigation-starter-kit", category: "irrigation", price: 129900, originalPrice: 159900, rating: 4.8, reviewsCount: 64, stock: 25, servesPerPerson: "Up to 25 plants", keywords: "drip,irrigation", lock: 51, accent: accent.irrigation, description: "Covers up to 25 plants. Includes connectors, adjustable drippers, and tubing." },
    { name: "Garden Hose 15m", slug: "garden-hose-15m", category: "irrigation", price: 59900, rating: 4.4, reviewsCount: 57, stock: 90, keywords: "garden,hose", lock: 52, accent: accent.irrigation, description: "Kink-resistant braided hose with brass fittings for everyday watering." },
    { name: "Watering Can 5L", slug: "watering-can-5l", category: "irrigation", price: 29900, rating: 4.5, reviewsCount: 80, stock: 110, keywords: "watering,can", lock: 53, accent: accent.irrigation, description: "Balanced 5 L can with a detachable rose head for gentle, even watering." },
    { name: "Adjustable Spray Nozzle", slug: "adjustable-spray-nozzle", category: "irrigation", price: 17900, rating: 4.3, reviewsCount: 44, stock: 140, keywords: "spray,nozzle", lock: 54, accent: accent.irrigation, description: "8-pattern metal trigger nozzle — from fine mist to a strong jet." },
    // Tools
    { name: "Stainless Steel Hand Trowel", slug: "stainless-steel-hand-trowel", category: "tools", price: 19900, rating: 4.6, reviewsCount: 70, stock: 130, keywords: "garden,trowel", lock: 61, accent: accent.tools, description: "Rust-proof trowel with an ergonomic non-slip grip for digging and transplanting." },
    { name: "Bypass Pruning Shears", slug: "bypass-pruning-shears", category: "tools", price: 34900, originalPrice: 42000, rating: 4.7, reviewsCount: 121, stock: 95, keywords: "pruning,shears", lock: 62, accent: accent.tools, description: "Sharp carbon-steel bypass blades with a safety lock — clean cuts on live stems." },
    { name: "Garden Gloves (Pair)", slug: "garden-gloves-pair", category: "tools", price: 14900, rating: 4.4, reviewsCount: 60, stock: 160, keywords: "garden,gloves", lock: 63, accent: accent.tools, description: "Breathable nitrile-coated gloves that shrug off thorns, soil, and water." },
    { name: "3-Piece Garden Tool Set", slug: "3-piece-garden-tool-set", category: "tools", price: 49900, rating: 4.5, reviewsCount: 48, stock: 70, keywords: "garden,tools", lock: 64, accent: accent.tools, description: "Trowel, transplanter, and cultivator in powder-coated steel with a hanging loop." },
    // Growth boosters
    { name: "Rooting Hormone Powder 100g", slug: "rooting-hormone-powder-100g", category: "growth-boosters", price: 17900, rating: 4.5, reviewsCount: 66, stock: 85, servesPerPerson: "100+ cuttings", keywords: "garden,powder", lock: 71, accent: accent["growth-boosters"], description: "Speeds up root development on cuttings — dip, plant, and grow." },
    { name: "Humic Acid Granules 500g", slug: "humic-acid-granules-500g", category: "growth-boosters", price: 25900, rating: 4.6, reviewsCount: 52, stock: 60, servesPerPerson: "Makes ~250 L", keywords: "granules,soil", lock: 72, accent: accent["growth-boosters"], description: "Improves nutrient uptake and soil microbial activity for stronger growth." },
    { name: "Chelated Micronutrient Mix 250g", slug: "chelated-micronutrient-mix-250g", category: "growth-boosters", price: 29900, rating: 4.4, reviewsCount: 39, stock: 70, servesPerPerson: "Foliar spray", keywords: "fertilizer,plant", lock: 73, accent: accent["growth-boosters"], description: "Corrects iron, zinc, and manganese deficiencies — fixes yellowing leaves fast." },
    // Pots
    { name: "Terracotta Pot 8 inch", slug: "terracotta-pot-8-inch", category: "pots", price: 14900, rating: 4.5, reviewsCount: 88, stock: 140, servesPerPerson: "1 plant", keywords: "terracotta,pot", lock: 81, accent: accent.pots, description: "Breathable clay pot with a drainage hole — ideal for herbs and succulents." },
    { name: "Grow Bags 12x12 (5-pack)", slug: "grow-bags-12x12-5pack", category: "pots", price: 24900, rating: 4.6, reviewsCount: 102, stock: 130, servesPerPerson: "5 plants", keywords: "grow,bag,plant", lock: 82, accent: accent.pots, description: "UV-stabilised HDPE grow bags — reusable, with drainage and sturdy handles." },
    { name: "Self-Watering Planter", slug: "self-watering-planter", category: "pots", price: 39900, rating: 4.4, reviewsCount: 35, stock: 60, servesPerPerson: "1–2 plants", keywords: "planter,pot", lock: 83, accent: accent.pots, description: "Built-in reservoir keeps roots evenly moist for up to a week between fills." },
  ];

  await db
    .insert(products)
    .values(
      catalog
        .filter((p) => catId[p.category])
        .map((p) => ({
          name: p.name,
          slug: p.slug,
          categoryId: catId[p.category]!,
          price: p.price,
          originalPrice: p.originalPrice ?? null,
          rating: p.rating,
          reviewsCount: p.reviewsCount,
          stock: p.stock,
          servesPerPerson: p.servesPerPerson ?? null,
          imageUrl: img(p.keywords, p.lock),
          accent: p.accent,
          description: p.description,
        })),
    )
    .onConflictDoNothing();

  // --- Supplements (sample; full set comes from mobile supplement_info.csv) -
  const [neem] = await db
    .insert(supplements)
    .values({
      name: "Neem Oil Concentrate",
      brand: "Plant+",
      imageUrl: "https://placehold.co/600x600/138A4C/FFFFFF?text=Neem",
      buyLink: "https://example.com/neem-oil",
      description: "Broad-spectrum botanical fungicide and insect repellent.",
      mappedDiseaseLabels: ["Tomato___Early_blight", "Apple___Apple_scab"],
    })
    .onConflictDoNothing()
    .returning();

  // --- Diseases (sample; full 39 PlantVillage classes come from disease_info.csv) -
  await db
    .insert(diseases)
    .values([
      {
        label: "Tomato___healthy",
        crop: "Tomato",
        disease: "Healthy",
        healthy: true,
        description: "Plant looks healthy — keep up the current care routine.",
        prevention: [
          "Maintain consistent watering",
          "Watch for early signs of pests",
          "Rotate crops each season",
        ],
        severity: "low",
      },
      {
        label: "Tomato___Early_blight",
        crop: "Tomato",
        disease: "Early Blight",
        healthy: false,
        description:
          "A fungal disease causing concentric brown spots on lower leaves. Spreads in warm, humid conditions.",
        prevention: [
          "Remove and destroy affected leaves",
          "Mulch around the base to prevent soil splash",
          "Water at the base, not overhead",
          "Apply a copper-based fungicide weekly until controlled",
        ],
        supplementId: neem?.id,
        severity: "medium",
      },
      {
        label: "Apple___Apple_scab",
        crop: "Apple",
        disease: "Apple Scab",
        healthy: false,
        description:
          "Olive-green to brown lesions on leaves and fruit, caused by Venturia inaequalis.",
        prevention: [
          "Rake and dispose of fallen leaves in autumn",
          "Prune for airflow through the canopy",
          "Apply preventive fungicide at green-tip stage",
        ],
        supplementId: neem?.id,
        severity: "high",
      },
    ])
    .onConflictDoNothing();

  // --- Blogs (sample posts; content is HTML authored in the admin editor) -
  const now = new Date();
  await db
    .insert(blogs)
    .values([
      {
        title: "5 Beginner-Friendly Houseplants That Thrive Indoors",
        slug: "beginner-friendly-houseplants",
        excerpt:
          "New to plant care? Start with these forgiving, low-light champions.",
        featuredImageUrl:
          "https://placehold.co/1200x675/138A4C/FFFFFF?text=Houseplants",
        tags: ["houseplants", "beginner", "indoor"],
        status: "published",
        publishedAt: now,
        content:
          "<h2>Start here</h2><p>If you've killed a plant or two, you're not alone. These five are famously hard to kill and perfect for building confidence.</p><ul><li><strong>Snake Plant</strong> — tolerates low light and infrequent watering.</li><li><strong>Pothos</strong> — trails beautifully and forgives missed waterings.</li><li><strong>ZZ Plant</strong> — thrives on neglect.</li><li><strong>Spider Plant</strong> — fast-growing and pet-friendly.</li><li><strong>Peace Lily</strong> — tells you when it's thirsty by drooping.</li></ul><blockquote>Tip: most beginners overwater. When in doubt, wait a day.</blockquote>",
      },
      {
        title: "How to Make Your Own Organic Compost at Home",
        slug: "organic-compost-at-home",
        excerpt:
          "Turn kitchen scraps into black gold with this simple 4-step routine.",
        featuredImageUrl:
          "https://placehold.co/1200x675/8B5E34/FFFFFF?text=Compost",
        tags: ["composting", "organic", "soil"],
        status: "published",
        publishedAt: now,
        content:
          "<h2>Why compost?</h2><p>Compost feeds your soil, cuts waste, and saves money on fertilizer.</p><h3>The 4 steps</h3><ol><li>Collect greens (veg scraps) and browns (dry leaves, cardboard).</li><li>Layer roughly 1 part greens to 2 parts browns.</li><li>Keep it moist like a wrung-out sponge.</li><li>Turn it weekly for airflow.</li></ol><p>In 6–8 weeks you'll have crumbly, earthy compost ready for your beds.</p>",
      },
      {
        title: "Spotting & Treating Early Blight on Tomatoes",
        slug: "early-blight-on-tomatoes",
        excerpt:
          "Those concentric brown rings aren't normal — here's how to act fast.",
        featuredImageUrl:
          "https://placehold.co/1200x675/2E7D32/FFFFFF?text=Tomato+Care",
        tags: ["tomatoes", "disease", "treatment"],
        status: "published",
        publishedAt: now,
        content:
          "<h2>What it looks like</h2><p>Early blight starts on older, lower leaves as dark spots with <em>concentric rings</em>, often surrounded by a yellow halo.</p><h3>Treat it</h3><ul><li>Remove and destroy affected leaves immediately.</li><li>Mulch to stop soil splashing spores onto leaves.</li><li>Water at the base, never overhead.</li><li>Apply a copper-based or neem spray weekly until controlled.</li></ul><p>Scan a leaf in the app for an instant diagnosis and product suggestions.</p>",
      },
      {
        title: "Monsoon Plant Care: A Quick Checklist",
        slug: "monsoon-plant-care-checklist",
        excerpt: "Heavy rain brings fungus and root rot. Keep your garden happy.",
        featuredImageUrl:
          "https://placehold.co/1200x675/1565C0/FFFFFF?text=Monsoon+Care",
        tags: ["seasonal", "care", "monsoon"],
        status: "published",
        publishedAt: now,
        content:
          "<h2>Before the rains</h2><ul><li>Check drainage holes — pots must never sit in water.</li><li>Move delicate plants under cover.</li></ul><h2>During the rains</h2><ul><li>Skip watering on wet days.</li><li>Watch for fungal spots and treat early.</li><li>Stake tall plants against wind.</li></ul>",
      },
      {
        title: "Choosing the Right Fertilizer for Your Garden",
        slug: "choosing-the-right-fertilizer",
        excerpt: "NPK, organic vs synthetic — a plain-English guide. (Draft)",
        featuredImageUrl:
          "https://placehold.co/1200x675/0A8F3C/FFFFFF?text=Fertilizer",
        tags: ["fertilizer", "guide"],
        status: "draft",
        content:
          "<h2>Understanding NPK</h2><p>The three numbers on every fertilizer bag are Nitrogen, Phosphorus, and Potassium…</p><p><em>This post is still a work in progress.</em></p>",
      },
    ])
    .onConflictDoNothing();

  // --- Settings (starter set) --------------------------------------------
  await db
    .insert(settings)
    .values([
      {
        key: "currency",
        value: "INR",
        description: "ISO-4217 code used by `Intl.NumberFormat` everywhere.",
      },
      {
        key: "supportHours",
        value: "Mon–Fri, 9:00–18:00 IST",
        description: "Shown on the mobile Support tab.",
      },
      {
        key: "weatherProvider",
        value: "open-meteo",
        description: "Forecast source for the mobile Home tab.",
      },
      {
        key: "featureFlags",
        value: { newScanFlow: false, communityFeed: false },
        description: "Toggles that gate work-in-progress features.",
      },
      {
        key: "appstoreLinks",
        value: {
          ios: "https://apps.apple.com/app/idXXXXXXXXX",
          android: "https://play.google.com/store/apps/details?id=plantplus.app",
        },
        description: "Store URLs surfaced by 'Rate us' and update prompts.",
      },
      {
        key: "lowStockThreshold",
        value: 10,
        description:
          "Stock count below this lights the Products list 'low' indicator.",
      },
    ])
    .onConflictDoNothing();

  console.log("Done.");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
