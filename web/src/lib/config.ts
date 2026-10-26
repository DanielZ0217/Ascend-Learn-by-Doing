import "server-only";
import { environmentSchema, publicProviderStatus } from "./config-schema";

export function getServerEnvironment() {
  const parsed = environmentSchema.safeParse(process.env);
  if (!parsed.success) {
    // Do not log values or the complete validation result: it may contain credentials.
    throw new Error("Invalid server configuration. Check the documented values in .env.local.");
  }
  return parsed.data;
}

export function getPublicProviderStatus() {
  return publicProviderStatus(getServerEnvironment());
}
