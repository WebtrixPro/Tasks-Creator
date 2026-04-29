import "server-only";

import { prisma } from "@/lib/db";
import { decryptToken, encryptToken } from "@/lib/crypto";
import { fetchAuthorization, pickBc3AccountId, refreshAccessToken } from "@/lib/basecamp";

const CONNECTION_ID = "default";
const REFRESH_SLACK_MS = 5 * 60 * 1000;

export async function getDecryptedTokens(): Promise<{
  accessToken: string;
  refreshToken: string;
  accountId: string;
  expiresAt: Date;
} | null> {
  const row = await prisma.basecampConnection.findUnique({ where: { id: CONNECTION_ID } });
  if (!row) return null;
  return {
    accessToken: decryptToken(row.accessTokenEnc),
    refreshToken: decryptToken(row.refreshTokenEnc),
    accountId: row.accountId,
    expiresAt: row.expiresAt,
  };
}

export async function saveTokensFromOAuth(accessToken: string, refreshToken: string, expiresInSeconds: number) {
  const auth = await fetchAuthorization(accessToken);
  const accountId = pickBc3AccountId(auth);
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

  await prisma.basecampConnection.upsert({
    where: { id: CONNECTION_ID },
    create: {
      id: CONNECTION_ID,
      accessTokenEnc: encryptToken(accessToken),
      refreshTokenEnc: encryptToken(refreshToken),
      expiresAt,
      accountId,
    },
    update: {
      accessTokenEnc: encryptToken(accessToken),
      refreshTokenEnc: encryptToken(refreshToken),
      expiresAt,
      accountId,
    },
  });
}

export async function ensureFreshAccessToken(): Promise<{ accessToken: string; accountId: string }> {
  const row = await prisma.basecampConnection.findUnique({ where: { id: CONNECTION_ID } });
  if (!row) throw new Error("Basecamp is not connected.");

  let accessToken = decryptToken(row.accessTokenEnc);
  const refreshToken = decryptToken(row.refreshTokenEnc);
  const needsRefresh = row.expiresAt.getTime() - Date.now() < REFRESH_SLACK_MS;

  if (needsRefresh) {
    const refreshed = await refreshAccessToken(refreshToken);
    accessToken = refreshed.access_token;
    const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000);
    await prisma.basecampConnection.update({
      where: { id: CONNECTION_ID },
      data: {
        accessTokenEnc: encryptToken(refreshed.access_token),
        refreshTokenEnc: encryptToken(refreshed.refresh_token),
        expiresAt,
      },
    });
  }

  return { accessToken, accountId: row.accountId };
}

export async function disconnectBasecamp() {
  await prisma.basecampConnection.deleteMany({ where: { id: CONNECTION_ID } });
}
