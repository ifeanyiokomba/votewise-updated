import { clearAuthCookies } from "@/lib/auth";
import { api, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

export const POST = api(async () => {
  await clearAuthCookies();
  return ok({ loggedOut: true });
});
