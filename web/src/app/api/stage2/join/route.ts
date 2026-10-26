import { z } from "zod";
import { apiError, readJson } from "@/lib/ai/http";
import { assertSameOrigin, joinSharedCompany, joinSharedCompanyByCode, sessionCookie } from "@/lib/stage2/store";

const joinSchema = z.union([
  z.object({ companyId: z.uuid(), inviteToken: z.string().min(20).max(256), displayName: z.string().trim().min(1).max(40) }),
  z.object({ joinCode: z.string().min(8).max(12), displayName: z.string().trim().min(1).max(40) }),
]);

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const input = joinSchema.parse(await readJson(request));
    const joined = "joinCode" in input ? joinSharedCompanyByCode(input) : joinSharedCompany(input);
    const response = Response.json({ blueprint: joined.blueprint, settings: joined.settings, participant: joined.participant, isOwner: joined.isOwner });
    response.headers.set("Set-Cookie", sessionCookie(joined.blueprint.company.id, joined.sessionToken));
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) { return apiError(error); }
}
