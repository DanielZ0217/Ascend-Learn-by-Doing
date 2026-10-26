import "server-only";

import { DataType, MilvusClient } from "@zilliz/milvus2-sdk-node";
import { embed } from "./embedding";

const COLLECTION = "hacktx_passages_v1";
let client: MilvusClient | undefined;
let ready: Promise<MilvusClient> | undefined;

function milvus(): MilvusClient {
  client ??= new MilvusClient({ address: process.env.MILVUS_ADDRESS || "127.0.0.1:19530", timeout: 6000 });
  return client;
}

async function collection(): Promise<MilvusClient> {
  if (!ready) ready = (async () => {
    const db = milvus();
    const exists = await db.hasCollection({ collection_name: COLLECTION });
    if (!exists.value) {
      await db.createCollection({ collection_name: COLLECTION, fields: [
        { name: "id", data_type: DataType.VarChar, is_primary_key: true, autoID: false, max_length: 128 },
        { name: "embedding", data_type: DataType.FloatVector, dim: 384 },
      ] });
      await db.createIndex({ collection_name: COLLECTION, field_name: "embedding",
        index_type: "AUTOINDEX", metric_type: "COSINE" });
    }
    await db.loadCollection({ collection_name: COLLECTION });
    return db;
  })().catch((error) => { ready = undefined; throw error; });
  return ready;
}

export async function indexVector(id: string, text: string): Promise<void> {
  const vector = await embed(text);
  const db = await collection();
  await db.upsert({ collection_name: COLLECTION, data: [{ id, embedding: vector }] });
}

export async function searchVectors(topic: string, limit = 20): Promise<string[]> {
  const vector = await embed(topic);
  const db = await collection();
  const result = await db.search({ collection_name: COLLECTION, data: vector,
    anns_field: "embedding", limit, output_fields: ["id"] });
  return result.results.map((item) => String(item.id));
}

export async function flushVectors(): Promise<void> {
  const db = await collection();
  const result = await db.flushSync({ collection_names: [COLLECTION] });
  if (!result.flushed) throw new Error("Milvus did not confirm the flush.");
}

export async function deleteVectors(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const db = await collection();
  const result = await db.delete({ collection_name: COLLECTION, ids });
  if (!["Success", 0].includes(result.status.error_code)) throw new Error("Milvus did not confirm vector deletion.");
  await flushVectors();
}

export async function pingVector(): Promise<boolean> {
  try { await collection(); return true; } catch { return false; }
}
