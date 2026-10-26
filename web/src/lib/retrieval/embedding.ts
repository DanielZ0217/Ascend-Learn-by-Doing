import "server-only";

import { join } from "node:path";
import { env, pipeline } from "@huggingface/transformers";

const MODEL = "onnx-community/all-MiniLM-L6-v2-ONNX";
async function loadExtractor() {
  return pipeline("feature-extraction", MODEL, { dtype: "q4" });
}
let extractorPromise: ReturnType<typeof loadExtractor> | undefined;

export async function embed(text: string): Promise<number[]> {
  env.cacheDir = join(process.cwd(), "data", "models");
  extractorPromise ??= loadExtractor();
  const extractor = await extractorPromise;
  const output = await extractor(text.slice(0, 4000), { pooling: "mean", normalize: true });
  const vector = Array.from(output.data as Float32Array);
  if (vector.length !== 384) throw new Error(`Embedding returned ${vector.length} dimensions.`);
  return vector;
}
