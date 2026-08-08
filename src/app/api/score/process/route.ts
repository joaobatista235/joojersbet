import type { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { syncMatchesFromApi } from "@/lib/matches-sync";
import { processMatchScoring, rebuildUserScore, rebuildRanking, ensureActiveSeason } from "@/lib/scoring-engine";

export const runtime = "nodejs";
export const maxDuration = 60;

const EXPECTED_SECRET = process.env.SYNC_SECRET ?? "dev";

interface RawMatch {
  id: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  homeTeam: string;
  awayTeam: string;
  leagueId?: number;
  scoredAt?: unknown;
}

function getSecret(request: NextRequest): string {
  return (
    request.headers.get("x-sync-secret") ??
    request.nextUrl.searchParams.get("secret") ??
    ""
  );
}

async function handleProcess() {
  if (!adminDb) {
    return Response.json({ error: "Firestore não configurado" }, { status: 500 });
  }

  try {
    const [syncedCount, seasonId] = await Promise.all([
      syncMatchesFromApi(),
      ensureActiveSeason(),
    ]);
    console.log(`[score/process] Synced ${syncedCount} matches, season: ${seasonId}`);

    const matchesSnap = await adminDb.collection("matches").limit(1000).get();

    const unprocessed = matchesSnap.docs
      .filter((d) => !d.data().scoredAt)
      .map((d) => ({ id: d.id, ...d.data() } as RawMatch))
      .filter((match) => {
        const hasFinalScore =
          match.homeScore !== null &&
          match.awayScore !== null &&
          match.homeScore !== undefined &&
          match.awayScore !== undefined;
        return match.status === "FINISHED" || hasFinalScore;
      });

    console.log(`[score/process] Unprocessed: ${unprocessed.length}`);

    if (unprocessed.length === 0) {
      return Response.json({ ok: true, processed: 0, syncedMatches: syncedCount, message: "Nada a processar" });
    }

    let totalProcessed = 0;
    const affectedUsers = new Set<string>();

    for (const match of unprocessed) {
      const hasFinalScore =
        match.homeScore !== null &&
        match.awayScore !== null &&
        match.homeScore !== undefined &&
        match.awayScore !== undefined;
      if (!hasFinalScore) continue;

      const result = await processMatchScoring(adminDb, {
        id: match.id,
        homeScore: match.homeScore as number,
        awayScore: match.awayScore as number,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        leagueId: match.leagueId,
        category: "futebol",
      }, seasonId);

      if (result.processed) {
        totalProcessed++;
        result.affectedUserIds.forEach((uid) => affectedUsers.add(uid));
      }
    }

    for (const uid of affectedUsers) {
      await rebuildUserScore(adminDb, uid);
    }
    if (affectedUsers.size > 0) {
      await rebuildRanking(adminDb);
    }

    console.log(`[score/process] Done: ${totalProcessed} matches, ${affectedUsers.size} users`);
    return Response.json({ ok: true, processed: totalProcessed, usersUpdated: affectedUsers.size, syncedMatches: syncedCount });
  } catch (err) {
    console.error("[score/process] Error:", err);
    return Response.json({ error: "Erro ao processar", detail: String(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (getSecret(request) !== EXPECTED_SECRET) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return handleProcess();
}

export async function GET(request: NextRequest) {
  if (getSecret(request) !== EXPECTED_SECRET) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return handleProcess();
}