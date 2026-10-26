import { z } from "zod";
import { apiError, readJson } from "@/lib/ai/http";
import { resetCompanyDemo } from "@/lib/company/restart";
import { assertSameOrigin, authenticate, requireCompanyOwner } from "@/lib/stage2/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { companyId } = z.object({ companyId: z.uuid() }).parse(await readJson(request));
    const participant = authenticate(request, companyId);
    requireCompanyOwner(participant);
    const { joinCode, inviteToken } = await resetCompanyDemo(participant);
    const response = Response.json({ ok: true, joinCode, inviteToken });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) { return apiError(error); }
}
