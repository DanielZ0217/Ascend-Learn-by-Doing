import { z } from "zod";
import { apiError, readJson } from "@/lib/ai/http";
import { restartCompany } from "@/lib/company/restart";
import { assertSameOrigin, authenticate, requireCompanyOwner } from "@/lib/stage2/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { companyId } = z.object({ companyId: z.uuid() }).parse(await readJson(request));
    requireCompanyOwner(authenticate(request, companyId));
    await restartCompany(companyId);
    const response = Response.json({ ok: true });
    response.headers.set("Set-Cookie", `hacktx_s2_${companyId.replaceAll("-", "")}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`);
    return response;
  } catch (error) { return apiError(error); }
}
