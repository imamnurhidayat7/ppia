/**
 * Force-update the about/ad-art page with the complete AD/ART content
 * from page-content.ts (overwrites any existing DB content).
 *
 * Usage: cd api && npx tsx prisma/_force-update-adart.ts
 *
 * `../src/lib/data-source` must be imported before `@prisma/client` so the
 * DATA_SOURCE switch (local vs supabase) resolves DATABASE_URL the same way
 * the running API does — otherwise this writes to whichever DB the raw
 * DATABASE_URL in .env happens to point at, which is Supabase, while the dev
 * server (via src/lib/prisma.ts) reads local Postgres. That mismatch is
 * exactly what happened here: the page updated on Supabase while `npm run dev`
 * kept serving the old, unrelated seed on localhost.
 */
import { DATA_SOURCE, describeDatabase } from "../src/lib/data-source";
import { PrismaClient } from "@prisma/client";
import { adArtContent } from "./page-content";

console.log(`DATA_SOURCE=${DATA_SOURCE} → ${describeDatabase()}`);
const prisma = new PrismaClient();

async function main() {
  const slug = "about/ad-art";
  console.log(`Force-updating ${slug} with complete AD/ART content...`);

  const existing = await prisma.page.findUnique({ where: { slug } });

  // Build the full content: header, preamble, adArticles, artArticles.
  const fullContent = {
    header: adArtContent.header,
    preamble: adArtContent.preamble,
    adArticles: adArtContent.adArticles,
    artArticles: adArtContent.artArticles,
  };

  if (existing) {
    await prisma.page.update({
      where: { slug },
      data: { content: fullContent as any },
    });
    console.log(`  ✅ Updated existing page (id: ${existing.id})`);
    console.log(`     AD articles: ${adArtContent.adArticles.length} babs`);
    console.log(`     ART articles: ${adArtContent.artArticles.length} babs`);
  } else {
    console.log(`  ⚠️  Page not found. Run db:seed-pages first.`);
    process.exit(1);
  }

  console.log("\n✅ Done!");
}

main()
  .catch((e) => {
    console.error("❌ Failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
