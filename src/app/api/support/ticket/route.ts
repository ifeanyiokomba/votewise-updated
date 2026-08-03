import { db } from "@/lib/db";
import { api, parseBody, ok } from "@/lib/api";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  subject: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
  organizationId: z.string().optional(),
});

export const POST = api(async (req) => {
  const input = await parseBody(req, schema);
  const priority = /otp|cannot login|urgent|cannot vote/i.test(input.subject) ? "HIGH" : "NORMAL";
  const ticket = await db.supportTicket.create({
    data: {
      name: input.name,
      email: input.email,
      subject: input.subject,
      message: input.message,
      priority,
      status: "OPEN",
      organizationId: input.organizationId ?? null,
    },
  });
  return ok({ ticket });
});
