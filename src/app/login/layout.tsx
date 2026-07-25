import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Entrar — JoojersBet",
  description: "Entre na sua conta JoojersBet com o Google para começar a palpitar.",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
