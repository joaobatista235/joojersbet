import { SidebarProvider } from "@/components/SidebarContext";
import { Sidebar } from "@/components/Sidebar";
import { DashboardShell } from "@/components/DashboardShell";
import { AuthGuard } from "@/components/AuthGuard";

export const metadata = {
  title: "Grupos — JoojerBets",
  description: "Compete com seus amigos em grupos privados.",
};

export default function GruposLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <SidebarProvider>
        <div
          className="flex"
          style={{ backgroundColor: "var(--bg-base)", minHeight: "100vh" }}
        >
          <Sidebar />
          <DashboardShell>{children}</DashboardShell>
        </div>
      </SidebarProvider>
    </AuthGuard>
  );
}
