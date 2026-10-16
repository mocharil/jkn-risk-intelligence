import { applyArsaMigration, closePool, dbHealth, getPool } from "../lib/db/pg";

async function main() {
  const pool = getPool();
  if (!pool) {
    console.error("DATABASE_URL belum diatur.");
    process.exit(1);
  }
  await applyArsaMigration(pool);
  console.log("Migrasi diterapkan.", JSON.stringify(await dbHealth()));
  await closePool();
}
main().catch((e) => {
  console.error("Migrasi gagal:", e.message);
  process.exit(1);
});
