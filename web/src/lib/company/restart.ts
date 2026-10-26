import "server-only";

import type { DatabaseSync } from "node:sqlite";
import { deleteCompanyGraph, recordCompanyGraph } from "@/lib/graph";
import { deleteCompanyCoachTurns } from "@/lib/memory";
import { deleteVectors } from "@/lib/retrieval/vector";
import { clearCompanyDemo, deleteSharedCompany, getCompanyForParticipant } from "@/lib/stage2/store";
import type { Stage2Participant } from "@/lib/contracts";
import { companySourceIds, deleteCompanyDocuments, getDb } from "@/lib/storage/db";

export async function restartCompany(companyId: string, db: DatabaseSync = getDb()): Promise<void> {
  const { documentIds, passageIds } = companySourceIds(companyId, db);
  // Remove external indexes first. Retrying is safe if an external service fails.
  await deleteVectors(passageIds);
  await deleteCompanyGraph(companyId, documentIds, passageIds);
  await deleteCompanyCoachTurns(companyId);
  db.exec("BEGIN IMMEDIATE");
  try {
    deleteCompanyDocuments(companyId, db);
    deleteSharedCompany(companyId, db);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export async function resetCompanyDemo(participant: Stage2Participant, db: DatabaseSync = getDb()) {
  const companyId = participant.companyId;
  const { blueprint } = getCompanyForParticipant(participant, db);
  const { documentIds, passageIds } = companySourceIds(companyId, db);
  await deleteVectors(passageIds);
  await deleteCompanyGraph(companyId, documentIds, passageIds);
  await deleteCompanyCoachTurns(companyId);
  const credentials = clearCompanyDemo(participant, db);
  try { await recordCompanyGraph(blueprint.company); } catch { /* the office remains usable without the optional graph */ }
  return credentials;
}
