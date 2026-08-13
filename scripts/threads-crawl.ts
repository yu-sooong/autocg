import { runDiscovery } from "../lib/crawler/run";
import { ensureSeed } from "../lib/storage/seed";

async function main() {
  await ensureSeed();
  const result = await runDiscovery();
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
