import "server-only";

const LAUNCHPAD_TOKEN = "https://launchpad.37signals.com/authorization/token";
const LAUNCHPAD_AUTH_JSON = "https://launchpad.37signals.com/authorization.json";

function userAgent(): string {
  return process.env.BASECAMP_USER_AGENT ?? "ScrumTaskCreator (https://github.com)";
}

export type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
};

export async function exchangeAuthorizationCode(code: string, redirectUri: string): Promise<TokenResponse> {
  const clientId = process.env.BASECAMP_CLIENT_ID;
  const clientSecret = process.env.BASECAMP_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("BASECAMP_CLIENT_ID and BASECAMP_CLIENT_SECRET are required.");

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code,
  });

  const res = await fetch(LAUNCHPAD_TOKEN, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": userAgent(),
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Basecamp token exchange failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<TokenResponse>;
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const clientId = process.env.BASECAMP_CLIENT_ID;
  const clientSecret = process.env.BASECAMP_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("BASECAMP_CLIENT_ID and BASECAMP_CLIENT_SECRET are required.");

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(LAUNCHPAD_TOKEN, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": userAgent(),
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Basecamp token refresh failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<TokenResponse>;
}

export type AuthorizationIdentity = {
  expires_at: string;
  accounts: Array<{
    product: string;
    id: number;
    name: string;
    href: string;
    app_href: string;
  }>;
};

export async function fetchAuthorization(accessToken: string): Promise<AuthorizationIdentity> {
  const res = await fetch(LAUNCHPAD_AUTH_JSON, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": userAgent(),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`authorization.json failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<AuthorizationIdentity>;
}

export function pickBc3AccountId(auth: AuthorizationIdentity): string {
  const preferred = process.env.BASECAMP_ACCOUNT_ID;
  const bc3 = auth.accounts.filter((a) => a.product === "bc3");
  if (bc3.length === 0) throw new Error("No Basecamp 3 (bc3) accounts on this authorization.");
  if (preferred) {
    const match = bc3.find((a) => String(a.id) === preferred);
    if (match) return String(match.id);
  }
  return String(bc3[0].id);
}

function apiBase(accountId: string): string {
  return `https://3.basecampapi.com/${accountId}`;
}

export type BasecampProject = {
  id: number;
  status: string;
  created_at: string;
  updated_at: string;
  name: string;
  description: string;
  purpose: string;
  bookmark_url: string;
  url: string;
  app_url: string;
  dock: Array<{
    id: number;
    title: string;
    name: string;
    enabled: boolean;
    position: number;
    url: string;
    app_url: string;
  }>;
};

export async function createProject(
  accessToken: string,
  accountId: string,
  name: string,
  description?: string
): Promise<BasecampProject> {
  const url = `${apiBase(accountId)}/projects.json`;
  
  const requestBody: Record<string, string> = { name };
  if (description?.trim()) {
    requestBody.description = description.trim();
  }
  
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "User-Agent": userAgent(),
    },
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`createProject failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<BasecampProject>;
}

export async function createCardTableColumn(
  accessToken: string,
  accountId: string,
  bucketId: string,
  cardTableId: string,
  title: string,
  description?: string
): Promise<{ id: number; title: string }> {
  const url = `${apiBase(accountId)}/buckets/${bucketId}/card_tables/${cardTableId}/columns.json`;
  
  const requestBody: Record<string, string> = { title };
  if (description?.trim()) {
    requestBody.description = description.trim();
  }
  
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "User-Agent": userAgent(),
    },
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`createCardTableColumn failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<{ id: number; title: string }>;
}

export async function getProjects(
  accessToken: string,
  accountId: string,
  status?: "active" | "archived" | "trashed"
): Promise<BasecampProject[]> {
  const baseUrl = apiBase(accountId);
  const url = new URL(`${baseUrl}/projects.json`);
  if (status) {
    url.searchParams.set("status", status);
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": userAgent(),
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`getProjects failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<BasecampProject[]>;
}

export type BasecampPerson = {
  id: number;
  name: string;
  email_address: string;
  title: string | null;
  avatar_url: string;
  admin: boolean;
  owner: boolean;
};

export async function getProjectPeople(
  accessToken: string,
  accountId: string,
  projectId: string
): Promise<BasecampPerson[]> {
  const url = `${apiBase(accountId)}/projects/${projectId}/people.json`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": userAgent(),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`getProjectPeople failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<BasecampPerson[]>;
}

export async function updateCard(
  accessToken: string,
  accountId: string,
  bucketId: string,
  cardId: string,
  body: { title?: string; content?: string; due_on?: string | null; assignee_ids?: number[] }
): Promise<void> {
  const url = `${apiBase(accountId)}/buckets/${bucketId}/card_tables/cards/${cardId}.json`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "User-Agent": userAgent(),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`updateCard failed (${res.status}): ${text}`);
  }
}

export async function getCardTable(accessToken: string, accountId: string, bucketId: string, cardTableId: string) {
  const url = `${apiBase(accountId)}/buckets/${bucketId}/card_tables/${cardTableId}.json`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": userAgent(),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`getCardTable failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<{
    id: number;
    title: string;
    lists: Array<{ id: number; title: string; type: string }>;
  }>;
}

export async function createCard(
  accessToken: string,
  accountId: string,
  bucketId: string,
  columnListId: string,
  body: { title: string; content: string; due_on?: string | null; notify?: boolean },
) {
  const url = `${apiBase(accountId)}/buckets/${bucketId}/card_tables/lists/${columnListId}/cards.json`;
  
  // Build request body, only include due_on if it has a value
  const requestBody: Record<string, unknown> = {
    title: body.title,
    content: body.content,
    notify: body.notify ?? false,
  };
  
  // Basecamp expects due_on as YYYY-MM-DD string
  if (body.due_on) {
    requestBody.due_on = body.due_on;
  }
  
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "User-Agent": userAgent(),
    },
    body: JSON.stringify(requestBody),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`createCard failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<{ id: number }>;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function richSection(heading: string, body: string): string {
  const t = body.trim();
  if (!t) return "";
  const blocks = t.split(/\n{2,}/);
  const inner = blocks.map((b) => `<p>${esc(b).replace(/\n/g, "<br />")}</p>`).join("");
  return `<h4>${esc(heading)}</h4>${inner}`;
}

export function buildCardContent(task: {
  userStory: string;
  description: string;
  acceptanceCriteria: string;
  estimate: string;
  priority: string;
}): string {
  const parts = [
    richSection("User story", task.userStory),
    richSection("Description", task.description),
    richSection("Acceptance criteria", task.acceptanceCriteria),
  ].filter(Boolean);

  if (task.estimate.trim() || task.priority.trim()) {
    parts.push(
      `<p><strong>Estimate:</strong> ${esc(task.estimate || "—")}<br /><strong>Priority:</strong> ${esc(task.priority || "—")}</p>`,
    );
  }

  return parts.join("") || "<p>(no description)</p>";
}
