import AuthGuard from "@/components/AuthGuard";
export default function UfcLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
