import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacidadePage() {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-base)", padding: "36px 28px 48px" }}>
      <Link
        href="/login"
        style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--text-muted)", textDecoration: "none", marginBottom: 32, fontSize: 14, fontWeight: 500 }}
      >
        <ArrowLeft size={16} /> Voltar
      </Link>
      
      <div style={{ maxWidth: 600 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text-primary)", marginBottom: 24 }}>Política de Privacidade</h1>
        
        <div style={{ display: "flex", flexDirection: "column", gap: 16, color: "var(--text-secondary)", fontSize: 15, lineHeight: 1.6 }}>
          <p>
            A sua privacidade é importante para nós. Esta política explica como coletamos e usamos as suas informações no JoojersBet.
          </p>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)", marginTop: 16 }}>Coleta de Dados</h2>
          <p>
            Utilizamos a autenticação do Google (Firebase Auth) para gerenciar o acesso à plataforma. Ao fazer login, coletamos apenas:
          </p>
          <ul style={{ paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
            <li>Seu Nome e Sobrenome (para exibição no ranking)</li>
            <li>Seu endereço de E-mail (para identificação única e contato)</li>
            <li>Sua foto de perfil do Google (para exibição no ranking e feed)</li>
          </ul>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)", marginTop: 16 }}>Uso e Exclusão</h2>
          <p>
            Seus dados são usados exclusivamente para o funcionamento do sistema de ranking e grupos. Não compartilhamos nem vendemos suas informações para terceiros.
          </p>
          <p>
            Você pode solicitar a exclusão permanente da sua conta e de todos os seus palpites a qualquer momento, acessando a aba Configurações dentro do aplicativo.
          </p>
        </div>
      </div>
    </div>
  );
}
