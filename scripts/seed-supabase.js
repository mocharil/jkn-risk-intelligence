/**
 * Standalone Supabase Seed Script
 * Run with: node scripts/seed-supabase.js
 */
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load .env.local if present
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || "";
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      process.env[key] = value;
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes("your-project-ref")) {
  console.error("❌ Supabase URL or Key not set in .env.local.");
  console.log("👉 Please update .env.local with your real Supabase credentials, then re-run.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSeed() {
  console.log("🚀 Seeding Supabase database:", supabaseUrl);

  const provinces = [
    { province_code: "ID-JK", name: "DKI Jakarta", latitude: -6.2088, longitude: 106.8456, island_group: "Java" },
    { province_code: "ID-JB", name: "Jawa Barat", latitude: -6.9175, longitude: 107.6191, island_group: "Java" },
    { province_code: "ID-JT", name: "Jawa Tengah", latitude: -7.151, longitude: 110.1403, island_group: "Java" },
    { province_code: "ID-JI", name: "Jawa Timur", latitude: -7.5361, longitude: 112.2384, island_group: "Java" },
    { province_code: "ID-SU", name: "Sumatera Utara", latitude: 2.1154, longitude: 99.5451, island_group: "Sumatra" },
    { province_code: "ID-BA", name: "Bali", latitude: -8.4095, longitude: 115.1889, island_group: "Bali & Nusa Tenggara" },
    { province_code: "ID-SN", name: "Sulawesi Selatan", latitude: -3.6687, longitude: 119.9741, island_group: "Sulawesi" },
  ];

  const { error: provError } = await supabase.from("provinces").upsert(provinces, { onConflict: "province_code" });
  if (provError) {
    console.error("❌ Provinces seed error:", provError.message);
  } else {
    console.log("✅ Seeded provinces successfully.");
  }

  const providers = [
    { provider_id: "HOSP-01", name: "RS Sehat Sentosa", type: "RS", province_code: "ID-JK", total_claims: 2840, high_risk_claims: 142, risk_score: 94, potential_exposure: 148500000000, dominant_risk_type: "UPCODING" },
    { provider_id: "HOSP-02", name: "RS Medika Utama", type: "RS", province_code: "ID-JB", total_claims: 1950, high_risk_claims: 88, risk_score: 89, potential_exposure: 92400000000, dominant_risk_type: "PHANTOM_BILLING" },
    { provider_id: "HOSP-03", name: "RS Mitra Husada", type: "RS", province_code: "ID-JI", total_claims: 1420, high_risk_claims: 64, risk_score: 82, potential_exposure: 68100000000, dominant_risk_type: "CLONING" },
    { provider_id: "HOSP-04", name: "RS Graha Medika", type: "RS", province_code: "ID-JT", total_claims: 1180, high_risk_claims: 42, risk_score: 76, potential_exposure: 42000000000, dominant_risk_type: "ABNORMAL_LOS" },
  ];

  const { error: proviError } = await supabase.from("providers").upsert(providers, { onConflict: "provider_id" });
  if (proviError) {
    console.error("❌ Providers seed error:", proviError.message);
  } else {
    console.log("✅ Seeded providers successfully.");
  }

  console.log("🎉 Seed finished!");
}

runSeed().catch(console.error);
