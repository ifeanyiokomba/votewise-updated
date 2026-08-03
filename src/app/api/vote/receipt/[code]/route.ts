import { api, ok } from "@/lib/api";
import { verifyReceipt } from "@/lib/sve/receipt";

export const dynamic = "force-dynamic";

export const GET = api(async (req, { params }: { params: Promise<{ code: string }> }) => {
  const { code } = await params;
  const r = await verifyReceipt(code);
  return ok(r);
});
