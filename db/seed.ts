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
      { name: "Seeds", slug: "seeds", icon: "sprout", order: 0 },
      { name: "Fertilizers", slug: "fertilizers", icon: "leaf", order: 1 },
      { name: "Soil", slug: "soil", icon: "shovel", order: 2 },
      { name: "Plant protection", slug: "plant-protection", icon: "shield", order: 3 },
      { name: "Irrigation", slug: "irrigation", icon: "droplets", order: 4 },
    ])
    .onConflictDoNothing();

  // --- Products (sample; full catalog comes from mobile products.json) ----
  // Prices are integer paise (1 INR = 100 paise). Re-read the categories we
  // just inserted to resolve their ids by slug.
  const catRows = await db
    .select({ id: categories.id, slug: categories.slug })
    .from(categories);
  const catId = Object.fromEntries(catRows.map((c) => [c.slug, c.id]));

  if (catId.seeds) {
    await db
      .insert(products)
      .values([
        {
          name: "Tomato Seeds (Hybrid F1)",
          slug: "tomato-seeds-hybrid-f1",
          categoryId: catId.seeds,
          price: 4900,
          originalPrice: 6900,
          rating: 4.5,
          reviewsCount: 128,
          stock: 240,
          imageUrl: "https://placehold.co/600x600/138A4C/FFFFFF?text=Seeds",
          gallery: [
            "https://placehold.co/600x600/138A4C/FFFFFF?text=Seeds+1",
            "https://placehold.co/600x600/0A8F3C/FFFFFF?text=Seeds+2",
          ],
          accent: "#138A4C",
          description:
            "High-yield hybrid tomato seeds with strong disease resistance. ~85 days to first harvest.",
        },
        {
          name: "Organic Vermicompost 5kg",
          slug: "organic-vermicompost-5kg",
          categoryId: catId.fertilizers,
          price: 29900,
          rating: 4.7,
          reviewsCount: 86,
          stock: 60,
          imageUrl: "https://placehold.co/600x600/8B5E34/FFFFFF?text=Compost",
          accent: "#8B5E34",
          description:
            "Nutrient-rich earthworm castings that improve soil structure and water retention.",
        },
        {
          name: "Cocopeat Block 5kg",
          slug: "cocopeat-block-5kg",
          categoryId: catId.soil,
          price: 19900,
          originalPrice: 24900,
          rating: 4.3,
          reviewsCount: 41,
          stock: 8, // below LOW_STOCK_THRESHOLD — exercises the "low" badge
          imageUrl: "https://placehold.co/600x600/6B4F2A/FFFFFF?text=Cocopeat",
          accent: "#6B4F2A",
          description:
            "Expands to ~75L of growing medium. Great for seed starting and container mixes.",
        },
        {
          name: "Neem Oil Spray 500ml",
          slug: "neem-oil-spray-500ml",
          categoryId: catId["plant-protection"],
          price: 34900,
          rating: 4.6,
          reviewsCount: 152,
          stock: 120,
          imageUrl: "https://placehold.co/600x600/2E7D32/FFFFFF?text=Neem",
          accent: "#2E7D32",
          description:
            "Ready-to-use botanical spray for aphids, mites, and common fungal issues.",
        },
        {
          name: "Drip Irrigation Starter Kit",
          slug: "drip-irrigation-starter-kit",
          categoryId: catId.irrigation,
          price: 129900,
          originalPrice: 159900,
          rating: 4.8,
          reviewsCount: 64,
          stock: 25,
          isActive: false, // exercises the "Hidden" status
          imageUrl: "https://placehold.co/600x600/1565C0/FFFFFF?text=Drip+Kit",
          accent: "#1565C0",
          description:
            "Covers up to 25 plants. Includes timer-ready connectors, drippers, and tubing.",
        },
      ])
      .onConflictDoNothing();
  }

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
