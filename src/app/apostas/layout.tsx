import AuthGuard from "@/components/AuthGuard";
export default function ApostasLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
