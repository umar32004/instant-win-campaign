import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_ACCESS_COOKIE, verifyAdminAccessToken } from "@/lib/auth";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_ACCESS_COOKIE)?.value;
  const claims = token ? await verifyAdminAccessToken(token) : null;

  if (!claims) {
    redirect("/admin/login");
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AdminSidebar adminName={claims.name || claims.email} role={claims.role} />
      <div className="flex-1 md:pl-64">
        <main className="p-6 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
