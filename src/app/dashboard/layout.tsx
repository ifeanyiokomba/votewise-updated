import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/auth";
import { DashboardShell } from "@/components/votewise/dashboard/shell";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const member = await getCurrentMember();
  if (!member) redirect("/login");
  return <DashboardShell>{children}</DashboardShell>;
}
