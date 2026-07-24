import { SidebarProvider } from "@/components/SidebarContext";
import { Sidebar } from "@/components/Sidebar";
import { DashboardShell } from "@/components/DashboardShell";
import { AuthGuard } from "@/components/AuthGuard";

export const metadata = {
  title: "Futebol — JoojerBets",
  description: "Faça seus palpites nas partidas de futebol.",
};

export default function FutebolLayout({
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
