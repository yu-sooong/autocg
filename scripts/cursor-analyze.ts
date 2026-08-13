import { CursorProvider, runCursorCliAnalysis, SHORT_PROMPT } from "../lib/ai/cursor";
import { currentFilteredFromDb } from "../lib/crawler/run";
import { readPromotionConfig } from "../lib/storage/json";

async function main() {
  const provider = new CursorProvider();
  const prepared = await provider.prepare({
    posts: await currentFilteredFromDb(),
    config: readPromotionConfig(),
  });
  console.log(prepared.message);
  console.log("\n--- Prompt ---\n");
  console.log(SHORT_PROMPT);
  if (process.argv.includes("--cli")) {
    const result = await runCursorCliAnalysis();
    console.log(result);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
