import { getPublicProviderStatus } from "@/lib/config";

export const dynamic = "force-dynamic";

export function GET() {
  try {
    return Response.json({ status: "ok", stage: "local-demo", providers: getPublicProviderStatus() });
  } catch {
    return Response.json({ status: "configuration-error", message: "Check local server configuration." }, { status: 503 });
  }
}
