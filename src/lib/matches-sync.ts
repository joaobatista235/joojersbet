import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { getLiveMatches, getFixturesByDate, getFixtureById } from "@/lib/api-football/client";
import type { Match } from "@/lib/api-football/types";

const PROACTIVE_DAYS_AHEAD = 7;
const PROACTIVE_DAYS_BEHIND = 2;
const MAX_STALE_LOOKUPS = 20;

function toDateKey(value?: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

export async function syncMatchesFromApi(): Promise<number> {
  if (!adminDb) {
    throw new Error("Firestore nao configurado");
  }

  const now = new Date();

  // Datas a buscar na API: de PROACTIVE_DAYS_BEHIND ate PROACTIVE_DAYS_AHEAD
  const dateCandidates = new Set<string>();
  for (let offset = -PROACTIVE_DAYS_BEHIND; offset <= PROACTIVE_DAYS_AHEAD; offset++) {
    const candidate = new Date(now);
    candidate.setDate(now.getDate() + offset);
    dateCandidates.add(candidate.toISOString().slice(0, 10));
  }

  // Buscar matches ativos no Firestore (sem limit pequeno - pegar todos)
  const existingSnap = await adminDb
    .collection("matches")
    .where("status", "in", ["LIVE", "UPCOMING", "OTHER"])
    .limit(1000)
    .get();

  const staleMatchIds: string[] = [];
  // IDs de matches que estao claramente expirados (startTime muito antigo)
  const expiredMatchIds: string[] = [];

  existingSnap.docs.forEach((doc) => {
    const data = doc.data() as { startTime?: string; status?: string };

    const key = toDateKey(data.startTime);
    if (key) dateCandidates.add(key);

    if (
      data.startTime &&
      (data.status === "UPCOMING" || data.status === "LIVE" || data.status === "OTHER")
    ) {
      const startDate = new Date(data.startTime);
      const hoursAgo = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60);

      if (hoursAgo > 4) {
        staleMatchIds.push(doc.id);
      }

      // Se o jogo comecou ha mais de 6 horas, e definitivamente expirado
      if (hoursAgo > 6) {
        expiredMatchIds.push(doc.id);
      }
    }
  });

  const relevantDates = Array.from(dateCandidates).sort();

  console.log(`[sync] Fetching dates: ${relevantDates.join(", ")}`);

  const dateResults = await Promise.all(relevantDates.map((d) => getFixturesByDate(d)));
  const liveMatches = await getLiveMatches();

  const matchMap = new Map<string, Match>();

  for (const m of liveMatches) matchMap.set(m.id, m);
  for (const batch of dateResults) {
    for (const m of batch) matchMap.set(m.id, m);
  }

  // Para matches stale que nao voltaram da API, tentar buscar individualmente
  const lookups = staleMatchIds
    .filter((id) => !matchMap.has(id))
    .slice(0, MAX_STALE_LOOKUPS);

  if (lookups.length > 0) {
    console.log(`[sync] Fetching ${lookups.length} stale matches by ID`);
    const staleResults = await Promise.all(
      lookups.map((id) => getFixtureById(id).catch(() => null))
    );
    for (const m of staleResults) {
      if (m) matchMap.set(m.id, m);
    }
  }

  const uniqueMatches = Array.from(matchMap.values());
  console.log(`[sync] Total matches to upsert: ${uniqueMatches.length}`);

  const BATCH_LIMIT = 490;
  if (uniqueMatches.length > 0) {
    for (let i = 0; i < uniqueMatches.length; i += BATCH_LIMIT) {
      const chunk = uniqueMatches.slice(i, i + BATCH_LIMIT);
      const writeBatch = adminDb.batch();
      for (const match of chunk) {
        writeBatch.set(
          adminDb.collection("matches").doc(match.id),
          { ...match, updatedAt: FieldValue.serverTimestamp() },
          { merge: true }
        );
      }
      await writeBatch.commit();
    }
  }

  // Orphan detection: matches que nao voltaram da API
  const orphanIds = staleMatchIds.filter((id) => !matchMap.has(id));

  if (orphanIds.length > 0) {
    console.log(`[sync] Force-finishing ${orphanIds.length} orphan stale matches`);
    const orphanBatch = adminDb.batch();
    for (const id of orphanIds) {
      orphanBatch.update(adminDb.collection("matches").doc(id), {
        status: "FINISHED",
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    await orphanBatch.commit();
  }

  // Limpeza extra: buscar TODOS os matches UPCOMING/LIVE/OTHER com startTime muito antigo
  // (nao cobertos pelo limit(1000) acima ou que escaparam de sync anteriores)
  try {
    const cutoffDate = new Date(now.getTime() - 8 * 60 * 60 * 1000); // 8 horas atras
    const ancientSnap = await adminDb
      .collection("matches")
      .where("status", "in", ["LIVE", "UPCOMING", "OTHER"])
      .where("startTime", "<", cutoffDate.toISOString())
      .limit(500)
      .get();

    const ancientOrphans = ancientSnap.docs.filter((doc) => !matchMap.has(doc.id));

    if (ancientOrphans.length > 0) {
      console.log(`[sync] Cleaning ${ancientOrphans.length} ancient orphan matches (>8h ago)`);
      const ancientBatch = adminDb.batch();
      for (const doc of ancientOrphans) {
        ancientBatch.update(doc.ref, {
          status: "FINISHED",
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
      await ancientBatch.commit();
    }
  } catch (err) {
    // Pode precisar de index composto no Firestore — nao falhar o sync principal
    console.warn("[sync] Ancient orphan cleanup failed (may need Firestore index):", err);
  }

  return uniqueMatches.length;
}
