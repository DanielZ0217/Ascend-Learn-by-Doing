import "server-only";

import { createClient, type RedisClientType } from "redis";
import type { ConversationTurn, RoleId } from "@/lib/contracts";

let clientPromise: Promise<RedisClientType> | undefined;

async function client(): Promise<RedisClientType> {
  if (!clientPromise) {
    clientPromise = (async () => {
      const connection = createClient({ url: process.env.REDIS_URL || "redis://127.0.0.1:6379" });
      connection.on("error", () => {});
      await connection.connect();
      return connection as RedisClientType;
    })().catch((error) => {
      clientPromise = undefined;
      throw error;
    });
  }
  return clientPromise;
}

function key(companyId: string, roleId: RoleId, participantId?: string): string {
  const base = `hacktx:coach:${encodeURIComponent(companyId)}:${roleId}`;
  return participantId ? `${base}:student:${encodeURIComponent(participantId)}:turns` : `${base}:turns`;
}

export async function getCoachTurns(args: {
  companyId: string;
  roleId: RoleId;
  assignmentId?: string;
  participantId?: string;
}): Promise<ConversationTurn[]> {
  const rows = await (await client()).lRange(key(args.companyId, args.roleId, args.participantId), -100, -1);
  const turns = rows.flatMap((row) => {
    try { return [JSON.parse(row) as ConversationTurn]; } catch { return []; }
  });
  return args.assignmentId ? turns.filter((turn) => turn.assignmentId === args.assignmentId) : turns;
}

export async function appendCoachTurn(args: {
  companyId: string;
  roleId: RoleId;
  turn: ConversationTurn;
  participantId?: string;
}): Promise<void> {
  const redis = await client();
  const list = key(args.companyId, args.roleId, args.participantId);
  await redis.rPush(list, JSON.stringify(args.turn));
  await redis.lTrim(list, -100, -1);
}

export async function pingMemory(): Promise<boolean> {
  try { return (await (await client()).ping()) === "PONG"; } catch { return false; }
}

export async function deleteCompanyCoachTurns(companyId: string): Promise<void> {
  const redis = await client();
  for await (const keys of redis.scanIterator({ MATCH: `hacktx:coach:${encodeURIComponent(companyId)}:*`, COUNT: 100 })) {
    if (keys.length) await redis.del(keys);
  }
}
