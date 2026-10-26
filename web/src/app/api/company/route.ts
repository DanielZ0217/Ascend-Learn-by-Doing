import { createCompanyBlueprint, createCompanyRequestSchema } from "@/lib/ai/company";
import { apiError, readJson } from "@/lib/ai/http";
import { createSharedCompany, sessionCookie } from "@/lib/stage2/store";

export async function POST(request: Request) {
  try {
    const input = createCompanyRequestSchema.parse(await readJson(request));
    const result = await createCompanyBlueprint(input);
    if (!input.stage2) return Response.json(result);
    const shared = createSharedCompany({ blueprint: result.blueprint, settings: {
      participantMode: input.participantMode, experienceMode: input.experienceMode,
      companyStage: input.companyStage, prompt: input.prompt, approvalMode: false,
      generationMode: result.mode,
    }, creatorName: input.creatorName });
    const response = Response.json({ ...result, stage2: { inviteToken: shared.inviteToken, joinCode: shared.joinCode, participant: shared.participant } });
    response.headers.set("Set-Cookie", sessionCookie(result.blueprint.company.id, shared.sessionToken));
    return response;
  } catch (error) {
    return apiError(error);
  }
}
