import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermosPage() {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-base)", padding: "36px 28px 48px" }}>
      <Link
        href="/login"
        style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--text-muted)", textDecoration: "none", marginBottom: 32, fontSize: 14, fontWeight: 500 }}
      >
        <ArrowLeft size={16} /> Voltar
      </Link>
      
      <div style={{ maxWidth: 600 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text-primary)", marginBottom: 24 }}>Termos de Uso</h1>
        
        <div style={{ display: "flex", flexDirection: "column", gap: 16, color: "var(--text-secondary)", fontSize: 15, lineHeight: 1.6 }}>
          <p>
            O JoojersBet é uma plataforma recreativa de palpites esportivos voltada para o entretenimento. Não somos uma casa de apostas e não envolvemos transações financeiras reais, prêmios em dinheiro ou jogos de azar.
          </p>
          <p>
            Ao utilizar nosso sistema, você concorda que:
          </p>
          <ul style={{ paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
            <li>Sua participação é puramente recreativa.</li>
            <li>A pontuação gerada não tem valor monetário.</li>
            <li>Você manterá o respeito com outros membros em grupos e no feed social.</li>
            <li>Podemos suspender contas que violem o bom uso do sistema.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
