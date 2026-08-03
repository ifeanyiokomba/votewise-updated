import { db } from "@/lib/db";
import { requireOfficial, HttpError } from "@/lib/guards";
import { api, parseBody, ok } from "@/lib/api";
import { audit } from "@/lib/audit";
import { z } from "zod";
import { createHash, randomBytes } from "crypto";

export const dynamic = "force-dynamic";

const SCOPES = [
  "read:elections", "write:elections", "read:voters", "write:voters",
  "read:results", "read:audit", "write:votes",
] as const;

export const GET = api(async (req) => {
  const member = await requireOfficial();
  const keys = await db.apiKey.findMany({
    where: { organizationId: member.organizationId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, name: true, keyPrefix: true, scopes: true, environment: true,
      isActive: true, lastUsedAt: true, expiresAt: true, createdAt: true,
    },
  });
  return ok({ keys: keys.map((k) => ({ ...k, scopes: JSON.parse(k.scopes) })), availableScopes: SCOPES });
});

const createSchema = z.object({
  name: z.string().min(2).max(80),
  scopes: z.array(z.string()).min(1),
  environment: z.enum(["production", "sandbox"]).default("production"),
});

export const POST = api(async (req) => {
  const member = await requireOfficial();
  if (!["ORG_OWNER", "ORG_ADMIN", "PLATFORM_ADMIN"].includes(member.role)) {
    throw new HttpError("FORBIDDEN", "Insufficient role", 403);
  }
  const input = await parseBody(req, createSchema);

  // Generate key: vw_live_ + 40 random chars
  const keyBody = randomBytes(20).toString("hex");
  const fullKey = `vw_${input.environment === "sandbox" ? "test" : "live"}_${keyBody}`;
  const keyHash = createHash("sha256").update(fullKey).digest("hex");
  const keyPrefix = fullKey.slice(0, 12);

  const apiKey = await db.apiKey.create({
    data: {
      organizationId: member.organizationId,
      name: input.name,
      keyPrefix,
      keyHash,
      scopes: JSON.stringify(input.scopes),
      environment: input.environment,
      isActive: true,
    },
  });

  await audit({
    organizationId: member.organizationId, actorId: member.id, actorRole: member.role, actorName: member.name,
    action: "API_KEY_CREATED", resource: "apikey", resourceId: apiKey.id,
    details: { name: input.name, scopes: input.scopes, environment: input.environment },
  });

  // Return the full key ONCE — it's never retrievable again
  return ok({
    apiKey: { id: apiKey.id, name: apiKey.name, keyPrefix, scopes: input.scopes, environment: input.environment },
    fullKey, // shown once
  });
});

const updateSchema = z.object({
  id: z.string(),
  isActive: z.boolean().optional(),
});

export const PATCH = api(async (req) => {
  const member = await requireOfficial();
  const input = await updateSchema.parse(await req.json().catch(() => ({})));
  const key = await db.apiKey.findUnique({ where: { id: input.id } });
  if (!key) throw new HttpError("NOT_FOUND", "API key not found", 404);
  if (key.organizationId !== member.organizationId) throw new HttpError("FORBIDDEN", "Not your key", 403);

  const updated = await db.apiKey.update({
    where: { id: input.id },
    data: { ...(input.isActive !== undefined && { isActive: input.isActive }) },
  });
  return ok({ apiKey: { id: updated.id, isActive: updated.isActive } });
});

export const DELETE = api(async (req) => {
  const member = await requireOfficial();
  const body = await req.json().catch(() => ({}));
  const id = (body as { id?: string }).id;
  if (!id) throw new HttpError("VALIDATION", "Key id required", 400);
  const key = await db.apiKey.findUnique({ where: { id } });
  if (!key) throw new HttpError("NOT_FOUND", "API key not found", 404);
  if (key.organizationId !== member.organizationId) throw new HttpError("FORBIDDEN", "Not your key", 403);
  await db.apiKey.delete({ where: { id } });
  await audit({
    organizationId: member.organizationId, actorId: member.id, actorRole: member.role, actorName: member.name,
    action: "API_KEY_DELETED", resource: "apikey", resourceId: id,
  });
  return ok({ deleted: true });
});
