import { SidebarProvider } from "@/components/SidebarContext";
import { Sidebar } from "@/components/Sidebar";
import { DashboardShell } from "@/components/DashboardShell";
import { AuthGuard } from "@/components/AuthGuard";

export const metadata = {
  title: "Central Ao Vivo — JoojerBets",
  description: "Acompanhe as partidas em tempo real.",
};

export default function AoVivoLayout({
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
