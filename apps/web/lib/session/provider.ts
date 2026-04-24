import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { accounts } from "@/lib/db/schema";
import type { Session } from "./types";

type AuthProvider = Session["authProvider"];

export function resolveAuthProviderFromProviderIds(
  providerIds: readonly string[],
): AuthProvider {
  if (providerIds.includes("vercel")) {
    return "vercel";
  }
  return "github";
}

export async function getAuthProviderForUser(
  userId: string,
): Promise<AuthProvider> {
  const rows = await db
    .select({ providerId: accounts.providerId })
    .from(accounts)
    .where(eq(accounts.userId, userId));

  return resolveAuthProviderFromProviderIds(rows.map((row) => row.providerId));
}
