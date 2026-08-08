import AuthGuard from "@/components/AuthGuard";

export default function Cs2Layout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
