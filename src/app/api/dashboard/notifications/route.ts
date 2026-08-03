import { db } from "@/lib/db";
import { requireOfficial } from "@/lib/guards";
import { api, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = api(async (req) => {
  const member = await requireOfficial();
  const orgId = member.organizationId;

  const url = new URL(req.url);
  const filter = url.searchParams.get("filter"); // "all" | "otp" | "announcement" | "system"

  // Get voter activity logs (OTP sends + vote casts)
  const voterActivity = await db.voterSession.findMany({
    where: { voter: { organizationId: orgId } },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true, createdAt: true, ipAddress: true, userAgent: true,
      voter: { select: { identifier: true, fullName: true, email: true, phone: true } },
      election: { select: { name: true } },
    },
  });

  // Get announcements as notifications
  const announcements = await db.announcement.findMany({
    where: { organizationId: orgId },
    orderBy: { publishedAt: "desc" },
    take: 20,
    select: { id: true, title: true, body: true, severity: true, publishedAt: true },
  });

  // Get recent audit events as system notifications
  const auditEvents = await db.auditLog.findMany({
    where: { organizationId: orgId, action: { in: ["VOTE_CAST", "ELECTION_CERTIFIED", "ELECTION_LIVE", "INCIDENT_REPORTED", "VOTER_FLAGGED", "MEMBER_INVITED", "PLAN_CHANGED"] } },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { id: true, action: true, actorName: true, createdAt: true, details: true },
  });

  // Combine + format
  type Notification = { id: string; type: string; title: string; description: string; timestamp: string; meta?: string };
  const notifications: Notification[] = [];

  if (!filter || filter === "otp") {
    for (const s of voterActivity) {
      notifications.push({
        id: `otp-${s.id}`,
        type: "otp",
        title: `OTP sent to ${s.voter.fullName}`,
        description: `Identifier: ${s.voter.identifier}${s.election ? ` · Election: ${s.election.name}` : ""}`,
        timestamp: s.createdAt.toISOString(),
        meta: s.voter.email ?? s.voter.phone ?? "—",
      });
    }
  }

  if (!filter || filter === "announcement") {
    for (const a of announcements) {
      notifications.push({
        id: `ann-${a.id}`,
        type: "announcement",
        title: `Announcement: ${a.title}`,
        description: a.body,
        timestamp: a.publishedAt.toISOString(),
        meta: a.severity,
      });
    }
  }

  if (!filter || filter === "system") {
    for (const e of auditEvents) {
      notifications.push({
        id: `sys-${e.id}`,
        type: "system",
        title: e.action.replace(/_/g, " ").toLowerCase(),
        description: e.actorName ?? "System",
        timestamp: e.createdAt.toISOString(),
        meta: e.details ?? undefined,
      });
    }
  }

  // sort by timestamp desc
  notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const counts = {
    all: notifications.length,
    otp: notifications.filter((n) => n.type === "otp").length,
    announcement: notifications.filter((n) => n.type === "announcement").length,
    system: notifications.filter((n) => n.type === "system").length,
  };

  return ok({ notifications: notifications.slice(0, 100), counts });
});
