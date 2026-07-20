import { normalizeKgEdgeWeight } from "../lib/validations/kg-schema.ts";
import { sanitizeHiddenChars, parseOcrTableToRows } from "../lib/utils/text-sanitizer.ts";
import { buildOriginAttribution, assertOriginAttribution, selfActor } from "../lib/ingesta/origin.ts";
import { ensureFeedbackSignalTable } from "../lib/ingesta/ensure-feedback-schema.ts";
import { processingQueue } from "../lib/processing-queue.ts";

async function main() {
  const w = normalizeKgEdgeWeight(99);
  console.log("weight", w.weight, "fellBack", w.fellBack);
  console.log("sanitize", JSON.stringify(sanitizeHiddenChars("hi\u0007there")));
  console.log("rows", parseOcrTableToRows("Elemento|Cantidad|Total|Cat\nAgua|2|10|bebida").length);
  assertOriginAttribution(buildOriginAttribution({ channel: "social", actors: [selfActor()] }));
  ensureFeedbackSignalTable();
  console.log("reclaim", await processingQueue.reclaimAndDrain());
  console.log("status", await processingQueue.getStatus());
}
main().catch((e) => { console.error(e); process.exit(1); });
