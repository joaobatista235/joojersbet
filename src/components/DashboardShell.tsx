"use client";

import { useSidebar } from "./SidebarContext";

const SIDEBAR_OPEN_W = 256;
const SIDEBAR_CLOSED_W = 72;

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { isOpen } = useSidebar();

  return (
    <div
      className="transition-[margin] duration-300 ease-in-out"
      style={{
        marginLeft: isOpen ? SIDEBAR_OPEN_W : SIDEBAR_CLOSED_W,
        minHeight: "100vh",
        width: `calc(100% - ${isOpen ? SIDEBAR_OPEN_W : SIDEBAR_CLOSED_W}px)`,
      }}
    >
      {children}
    </div>
  );
}
