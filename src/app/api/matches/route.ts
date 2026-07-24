// ─── GET /api/matches ─────────────────────────────────────────────────────────
// Fallback server-side: lê partidas do Firestore e retorna JSON.
// Usado como fallback quando o listener client-side falha (SSR, Suspense, etc.).
// Query params:
//   ?status=LIVE|UPCOMING|FINISHED   (obrigatório)
//   ?limit=10                        (opcional, default 20)

import type { NextRequest } from "next/server";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  limit as fsLimit,
  getDocs,
} from "firebase/firestore";
import type { Match } from "@/lib/api-football/types";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!db) {
    return Response.json(
      { error: "Firestore não configurado" },
      { status: 500 }
    );
  }

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status") as Match["status"] | null;
  const limitParam = Number(searchParams.get("limit") ?? "20");

  if (!status || !["LIVE", "UPCOMING", "FINISHED", "OTHER"].includes(status)) {
    return Response.json(
      { error: "Query param 'status' inválido ou ausente" },
      { status: 400 }
    );
  }

  try {
    const q = query(
      collection(db, "matches"),
      where("status", "==", status),
      orderBy("startTime", "asc"),
      fsLimit(Math.min(limitParam, 50))
    );

    const snap = await getDocs(q);
    let matches = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Match));

    // Filtrar apenas ligas permitidas
    const ALLOWED = new Set([
      71, 72, 39, 140, 135, 61, 94, 307, 253,
      1, 4, 9, 13, 11, 2, 3, 73, 45, 143, 137, 66, 96
    ]);
    matches = matches.filter((m) => m.leagueId && ALLOWED.has(m.leagueId));

    return Response.json({ matches, total: matches.length });
  } catch (err) {
    console.error("[api/matches]", err);
    return Response.json(
      { error: "Erro ao buscar partidas", detail: String(err) },
      { status: 500 }
    );
  }
}
