import { db } from "@/lib/db";
import { requireOfficial, HttpError } from "@/lib/guards";
import { api, parseBody, ok } from "@/lib/api";
import { audit } from "@/lib/audit";
import { z } from "zod";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

const WEBHOOK_EVENTS = [
  "election.created", "election.scheduled", "election.opened", "election.paused",
  "election.closed", "election.certified", "vote.cast", "voter.registered",
  "incident.reported", "announcement.published",
] as const;

export const GET = api(async (req) => {
  const member = await requireOfficial();
  const webhooks = await db.webhook.findMany({
    where: { organizationId: member.organizationId },
    orderBy: { createdAt: "desc" },
  });
  return ok({ webhooks, availableEvents: WEBHOOK_EVENTS });
});

const createSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1),
});

export const POST = api(async (req) => {
  const member = await requireOfficial();
  if (!["ORG_OWNER", "ORG_ADMIN", "PLATFORM_ADMIN"].includes(member.role)) {
    throw new HttpError("FORBIDDEN", "Insufficient role", 403);
  }
  const input = await parseBody(req, createSchema);
  const secret = randomBytes(24).toString("hex");

  const webhook = await db.webhook.create({
    data: {
      organizationId: member.organizationId,
      url: input.url,
      secret,
      events: JSON.stringify(input.events),
      isActive: true,
    },
  });

  await audit({
    organizationId: member.organizationId, actorId: member.id, actorRole: member.role, actorName: member.name,
    action: "WEBHOOK_CREATED", resource: "webhook", resourceId: webhook.id,
    details: { url: input.url, events: input.events },
  });

  return ok({ webhook: { ...webhook, events: JSON.parse(webhook.events) } });
});

const updateSchema = z.object({
  id: z.string(),
  isActive: z.boolean().optional(),
  url: z.string().url().optional(),
  events: z.array(z.string()).optional(),
});

export const PATCH = api(async (req) => {
  const member = await requireOfficial();
  const input = await updateSchema.parse(await req.json().catch(() => ({})));
  const webhook = await db.webhook.findUnique({ where: { id: input.id } });
  if (!webhook) throw new HttpError("NOT_FOUND", "Webhook not found", 404);
  if (webhook.organizationId !== member.organizationId) throw new HttpError("FORBIDDEN", "Not your webhook", 403);

  const data: Record<string, unknown> = {};
  if (input.isActive !== undefined) data.isActive = input.isActive;
  if (input.url !== undefined) data.url = input.url;
  if (input.events !== undefined) data.events = JSON.stringify(input.events);

  const updated = await db.webhook.update({ where: { id: input.id }, data });
  return ok({ webhook: { ...updated, events: JSON.parse(updated.events) } });
});

export const DELETE = api(async (req) => {
  const member = await requireOfficial();
  const body = await req.json().catch(() => ({}));
  const id = (body as { id?: string }).id;
  if (!id) throw new HttpError("VALIDATION", "Webhook id required", 400);
  const webhook = await db.webhook.findUnique({ where: { id } });
  if (!webhook) throw new HttpError("NOT_FOUND", "Webhook not found", 404);
  if (webhook.organizationId !== member.organizationId) throw new HttpError("FORBIDDEN", "Not your webhook", 403);
  await db.webhook.delete({ where: { id } });
  await audit({
    organizationId: member.organizationId, actorId: member.id, actorRole: member.role, actorName: member.name,
    action: "WEBHOOK_DELETED", resource: "webhook", resourceId: id,
  });
  return ok({ deleted: true });
});
