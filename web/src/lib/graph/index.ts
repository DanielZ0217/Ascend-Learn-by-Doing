import "server-only";

import neo4j, { type Driver } from "neo4j-driver";
import type { Assignment, Company, RoleId } from "@/lib/contracts";

let driver: Driver | undefined;

function graph(): Driver {
  if (!driver) {
    const password = process.env.NEO4J_PASSWORD;
    if (!password) throw new Error("Neo4j is not configured.");
    driver = neo4j.driver(process.env.NEO4J_URI || "bolt://127.0.0.1:7687",
      neo4j.auth.basic(process.env.NEO4J_USER || "neo4j", password));
  }
  return driver;
}

export async function pingGraph(): Promise<boolean> {
  try { await graph().verifyConnectivity(); return true; } catch { return false; }
}

export async function deleteCompanyGraph(companyId: string, documentIds: string[], passageIds: string[]): Promise<void> {
  const db = graph();
  if (passageIds.length) await db.executeQuery("MATCH (p:Passage) WHERE p.id IN $ids DETACH DELETE p", { ids: passageIds });
  if (documentIds.length) await db.executeQuery("MATCH (s:Source) WHERE s.id IN $ids DETACH DELETE s", { ids: documentIds });
  const scope = { companyId };
  await db.executeQuery("MATCH (c:Company {id:$companyId})-[:HAS_TASK]->(t:Task)-[:ADDRESSES]->(i:CustomerIssue) DETACH DELETE i", scope);
  await db.executeQuery("MATCH (c:Company {id:$companyId})-[:HAS_TASK]->(t:Task) DETACH DELETE t", scope);
  await db.executeQuery("MATCH (c:Company {id:$companyId})-[:HAS_ROLE]->(r:Role) DETACH DELETE r", scope);
  await db.executeQuery("MATCH (c:Company {id:$companyId})-[:OFFERS]->(p:Product) DETACH DELETE p", scope);
  await db.executeQuery("MATCH (c:Company {id:$companyId}) DETACH DELETE c", scope);
}

export async function recordCompanyGraph(company: Company): Promise<void> {
  await graph().executeQuery(`
    MERGE (c:Company {id:$companyId})
    SET c.name=$name, c.industry=$industry
    WITH c UNWIND $roles AS roleId
    MERGE (r:Role {id:$companyId + ':' + roleId})
    SET r.roleId=roleId
    MERGE (c)-[:HAS_ROLE]->(r)
    MERGE (tag:RoleTag {id:roleId})
    MERGE (r)-[:PRACTICES]->(tag)
  `, { companyId: company.id, name: company.name,
    industry: company.industry || company.preset, roles: company.roleIds });
  await graph().executeQuery(`
    MATCH (c:Company {id:$companyId})
    UNWIND $products AS name
    MERGE (p:Product {id:$companyId + ':' + name})
    SET p.name=name
    MERGE (c)-[:OFFERS]->(p)
  `, { companyId: company.id, products: company.products });
}

export async function recordPassageGraph(args: {
  passageId: string;
  documentId: string;
  roleId: RoleId | null;
  companyId: string | null;
  title: string;
}): Promise<void> {
  await graph().executeQuery(`
    MERGE (s:Source {id:$documentId}) SET s.title=$title
    MERGE (p:Passage {id:$passageId}) SET p.title=$title
    MERGE (s)-[:CONTAINS]->(p)
    WITH p
    FOREACH (_ IN CASE WHEN $roleId IS NULL THEN [] ELSE [1] END |
      MERGE (tag:RoleTag {id:$roleId})
      MERGE (tag)-[:HAS_SOURCE]->(p))
    WITH p
    FOREACH (_ IN CASE WHEN $companyId IS NULL THEN [] ELSE [1] END |
      MERGE (c:Company {id:$companyId})
      MERGE (c)-[:HAS_SOURCE]->(p))
  `, args);
}

export async function getConnectedPassageIds(args: {
  companyId: string; roleId: RoleId; limit?: number;
}): Promise<string[]> {
  const result = await graph().executeQuery(`
    MATCH (c:Company {id:$companyId})-[:HAS_ROLE]->(r:Role {roleId:$roleId})
    MATCH (r)-[:PRACTICES]->(:RoleTag)-[:HAS_SOURCE]->(p:Passage)
    RETURN DISTINCT p.id AS id LIMIT $limit
  `, { companyId: args.companyId, roleId: args.roleId, limit: neo4j.int(args.limit ?? 30) });
  return result.records.map((record) => String(record.get("id")));
}

export async function recordAssignmentGraph(args: {
  assignment: Assignment;
  company: Company;
  sourceIds: string[];
}): Promise<void> {
  await recordCompanyGraph(args.company);
  await graph().executeQuery(`
    MATCH (c:Company {id:$companyId})-[:HAS_ROLE]->(r:Role {roleId:$roleId})
    MERGE (t:Task {id:$taskId})
    SET t.title=$title, t.kind=$kind
    MERGE (r)-[:OWNS_TASK]->(t)
    MERGE (c)-[:HAS_TASK]->(t)
    MERGE (issue:CustomerIssue {id:$taskId}) SET issue.summary=$title
    MERGE (t)-[:ADDRESSES]->(issue)
    WITH t UNWIND $sourceIds AS sourceId
    MERGE (p:Passage {id:sourceId})
    MERGE (t)-[:GROUNDED_IN]->(p)
  `, { companyId: args.company.id, roleId: args.assignment.roleId,
    taskId: args.assignment.id, title: args.assignment.title,
    kind: args.assignment.kind, sourceIds: args.sourceIds });
}
