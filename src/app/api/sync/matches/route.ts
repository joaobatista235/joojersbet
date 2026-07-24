// Busca partidas ao vivo + do dia na API-Football e sincroniza no Firestore.
// Protegido por header x-sync-secret para uso em cron Vercel.
// Em dev, pode ser chamado manualmente:
//   curl -X POST http://localhost:3000/api/sync/matches \
//        -H "x-sync-secret: dev"

import type { NextRequest } from "next/server";
import { db } from "@/lib/firebase";
import { doc, writeBatch } from "firebase/firestore";
import { getLiveMatches, getUpcomingFixtures } from "@/lib/api-football/client";
import type { Match } from "@/lib/api-football/types";

export const runtime = "nodejs";

// Em produção, define SYNC_SECRET no env. Em dev, qualquer valor é aceito.
const EXPECTED_SECRET = process.env.SYNC_SECRET ?? "dev";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-sync-secret") ?? "";
  if (secret !== EXPECTED_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!db) {
    return Response.json(
      { error: "Firestore não configurado. Verifique .env.local." },
      { status: 500 }
    );
  }

  try {
    const [live, upcoming] = await Promise.all([
      getLiveMatches(),
      getUpcomingFixtures(2), // Hoje e amanhã
    ]);

    // Mesclar evitando duplicatas
    const matchMap = new Map<string, Match>();
    for (const m of [...upcoming, ...live]) {
      matchMap.set(m.id, m);
    }
    const matches = Array.from(matchMap.values());

    const BATCH_SIZE = 499;
    let synced = 0;
    const errors: string[] = [];

    for (let i = 0; i < matches.length; i += BATCH_SIZE) {
      const chunk = matches.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);
      for (const match of chunk) {
        const ref = doc(db, "matches", match.id);
        batch.set(ref, match, { merge: true });
      }
      try {
        await batch.commit();
        synced += chunk.length;
      } catch (err) {
        errors.push(String(err));
      }
    }

    // Limpeza de jogos antigos (> 7 dias)
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { collection, query, where, getDocs } = await import("firebase/firestore");
      const oldQ = query(
        collection(db, "matches"),
        where("startTime", "<", sevenDaysAgo.toISOString())
      );
      const oldSnap = await getDocs(oldQ);
      
      if (!oldSnap.empty) {
        // Se houver mais de 500, o limit do batch é 500. Vamos deletar os primeiros 500 para simplificar.
        const delBatch = writeBatch(db);
        const toDelete = oldSnap.docs.slice(0, 499);
        toDelete.forEach((d) => delBatch.delete(d.ref));
        await delBatch.commit();
      }
    } catch (cleanupErr) {
      console.error("[sync/matches] Erro no cleanup:", cleanupErr);
    }

    return Response.json({
      ok: true,
      synced,
      total: matches.length,
      errors,
    });
  } catch (err) {
    console.error("[sync/matches]", err);
    return Response.json(
      { error: "Erro ao sincronizar partidas", detail: String(err) },
      { status: 500 }
    );
  }
}
