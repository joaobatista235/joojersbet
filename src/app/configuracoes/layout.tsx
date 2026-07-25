import { SidebarProvider } from "@/components/SidebarContext";
import { Sidebar } from "@/components/Sidebar";
import { DashboardShell } from "@/components/DashboardShell";
import { AuthGuard } from "@/components/AuthGuard";

export const metadata = {
  title: "Configurações — JoojersBet",
  description: "Ajuste suas preferências.",
};

export default function ConfiguracoesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <SidebarProvider>
        <div className="flex" style={{ backgroundColor: "var(--bg-base)", minHeight: "100vh" }}>
          <Sidebar />
          <DashboardShell>{children}</DashboardShell>
        </div>
      </SidebarProvider>
    </AuthGuard>
  );
}
