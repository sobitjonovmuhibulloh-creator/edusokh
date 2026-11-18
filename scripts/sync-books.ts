/**
 * `npm run books:sync`              — rasmiy portaldan darsliklar ro'yxatini yig'ish (tez, diskda joy olmaydi)
 * `npm run books:sync -- --download` — PDF'larni public/books ga yuklab olish (~1,5 GB)
 * `npm run books:sync -- --download 20` — eng ko'pi 20 ta faylni yuklash
 */
import { syncBooks } from "../src/lib/book-scraper";

const args = process.argv.slice(2);
const download = args.includes("--download");
const limit = Number(args.find((a) => /^\d+$/.test(a))) || undefined;

syncBooks({ download, limit })
  .then((r) => {
    const byLang = r.added.reduce<Record<string, number>>((acc, b) => ((acc[b.lang] = (acc[b.lang] ?? 0) + 1), acc), {});
    console.log(`Qo'shildi: ${r.added.length} ${JSON.stringify(byLang)}, o'tkazib yuborildi: ${r.skipped.length}, xato: ${r.errors.length}`);
    for (const e of r.errors.slice(0, 20)) console.log(`  ✗ ${e.error}: ${e.url}`);
    process.exit(r.errors.length > 0 && r.added.length === 0 ? 1 : 0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
