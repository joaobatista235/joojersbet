import { SidebarProvider } from "@/components/SidebarContext";
import { Sidebar } from "@/components/Sidebar";
import { DashboardShell } from "@/components/DashboardShell";
import { AuthGuard } from "@/components/AuthGuard";

export const metadata = {
  title: "Rankings — JoojerBets",
  description: "Ranking global de pontuação do bolão.",
};

export default function RankingsLayout({
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
