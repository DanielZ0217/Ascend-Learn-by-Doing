import { z } from "zod";
import { apiError } from "@/lib/ai/http";
import { getLearningStyle, learnerIdentity, removeLearningStyle } from "@/lib/learner-preferences";
import { assertSameOrigin, authenticate } from "@/lib/stage2/store";

const companyIdSchema = z.uuid();

export async function GET(request: Request) {
  try {
    const companyId = companyIdSchema.parse(new URL(request.url).searchParams.get("companyId"));
    authenticate(request, companyId);
    const identity = learnerIdentity(request);
    const response = Response.json({ style: getLearningStyle(companyId, identity.key) });
    if (identity.setCookie) response.headers.append("Set-Cookie", identity.setCookie);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    const companyId = companyIdSchema.parse(new URL(request.url).searchParams.get("companyId"));
    authenticate(request, companyId);
    const identity = learnerIdentity(request);
    removeLearningStyle(companyId, identity.key);
    const response = Response.json({ style: null });
    if (identity.setCookie) response.headers.append("Set-Cookie", identity.setCookie);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) { return apiError(error); }
}
