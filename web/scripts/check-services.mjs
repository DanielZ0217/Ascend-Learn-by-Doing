import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { createClient } from "redis";
import neo4j from "neo4j-driver";
import { MilvusClient } from "@zilliz/milvus2-sdk-node";

function localSetting(name) {
  const line = readFileSync(".env.local", "utf8").split(/\r?\n/).find((row) => row.startsWith(`${name}=`));
  return line?.slice(name.length + 1).trim().replace(/^['"]|['"]$/g, "") ?? "";
}

const report = { sqlite: {}, redis: {}, neo4j: {}, milvus: {} };
const database = new DatabaseSync("data/hacktx.sqlite", { readOnly: true });
report.sqlite = database.prepare("SELECT (SELECT COUNT(*) FROM documents) AS documents, (SELECT COUNT(*) FROM passages) AS passages").get();
database.close();

const redis = createClient({ url: localSetting("REDIS_URL") || "redis://127.0.0.1:6379" });
redis.on("error", () => {});
try {
  await redis.connect();
  let coachKeys = 0;
  for await (const key of redis.scanIterator({ MATCH: "hacktx:coach:*:turns", COUNT: 100 })) {
    if (key) coachKeys++;
  }
  report.redis = { ping: await redis.ping(), coachKeys };
} catch (error) { report.redis = { error: error instanceof Error ? error.name : "unknown" }; }
finally { if (redis.isOpen) await redis.quit(); }

const password = localSetting("NEO4J_PASSWORD");
if (password) {
  const driver = neo4j.driver(localSetting("NEO4J_URI") || "bolt://127.0.0.1:7687",
    neo4j.auth.basic(localSetting("NEO4J_USER") || "neo4j", password));
  try {
    const counts = await driver.executeQuery(`MATCH (c:Company)
      RETURN count(c) AS companies`);
    const connections = await driver.executeQuery(`MATCH (:RoleTag)-[:HAS_SOURCE]->(p:Passage)
      RETURN count(p) AS roleSourceLinks`);
    const taskPaths = await driver.executeQuery(`MATCH (:Company)-[:HAS_ROLE]->(:Role)-[:OWNS_TASK]->(t:Task)-[:GROUNDED_IN]->(:Passage)
      RETURN count(t) AS taskSourcePaths`);
    report.neo4j = {
      companies: counts.records[0].get("companies").toNumber(),
      roleSourceLinks: connections.records[0].get("roleSourceLinks").toNumber(),
      taskSourcePaths: taskPaths.records[0].get("taskSourcePaths").toNumber(),
    };
  } catch (error) { report.neo4j = { error: error instanceof Error ? error.name : "unknown" }; }
  finally { await driver.close(); }
} else report.neo4j = { error: "not configured" };

const milvus = new MilvusClient({ address: localSetting("MILVUS_ADDRESS") || "127.0.0.1:19530", timeout: 6000 });
try {
  const collection = await milvus.hasCollection({ collection_name: "hacktx_passages_v1" });
  const stats = collection.value
    ? await milvus.getCollectionStatistics({ collection_name: "hacktx_passages_v1" }) : null;
  const rowCount = Number(stats?.stats?.find((item) => item.key === "row_count")?.value ?? 0);
  report.milvus = { collection: collection.value, rows: rowCount };
} catch (error) { report.milvus = { error: error instanceof Error ? error.name : "unknown" }; }
finally { milvus.closeConnection(); }

console.log(JSON.stringify(report, null, 2));
if (report.redis.ping !== "PONG" || report.redis.coachKeys < 1
  || !report.milvus.collection || report.milvus.rows < 1
  || report.neo4j.roleSourceLinks < 5 || report.neo4j.taskSourcePaths < 1
  || report.sqlite.documents < 5) process.exitCode = 1;
