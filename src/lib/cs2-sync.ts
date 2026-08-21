import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { getLiveCs2Matches, getUpcomingCs2Matches, getPastCs2Matches, getCs2MatchById } from "@/lib/pandascore/client";
import type { Cs2Match } from "@/lib/pandascore/types";

const MAX_STALE_HOURS = 6;

export async function syncCs2Matches(): Promise<number> {
  if (!adminDb) throw new Error("Firestore não configurado");

  const [liveMatches, upcomingMatches, pastMatches] = await Promise.all([
    getLiveCs2Matches(),
    getUpcomingCs2Matches(7),
    getPastCs2Matches(),
  ]);

  const now = new Date();
  const matchMap = new Map<string, Cs2Match>();
  for (const m of [...liveMatches, ...upcomingMatches, ...pastMatches]) {
    matchMap.set(m.id, m);
  }

  const staleSnap = await adminDb
    .collection("cs2Matches")
    .where("status", "in", ["LIVE", "UPCOMING", "OTHER"])
    .limit(200)
    .get();

  const lookups = new Set<string>();

  for (const doc of staleSnap.docs) {
    const data = doc.data() as { startTime?: string };
    if (!matchMap.has(doc.id) && data.startTime) {
      const hoursAgo = (now.getTime() - new Date(data.startTime).getTime()) / (1000 * 60 * 60);
      if (hoursAgo > MAX_STALE_HOURS) lookups.add(doc.id);
    }
  }

  const brokenSnap = await adminDb
    .collection("cs2Matches")
    .where("status", "==", "FINISHED")
    .limit(200)
    .get();

  for (const doc of brokenSnap.docs) {
    const data = doc.data() as { winnerId?: number | null; scoredAt?: unknown };
    if (data.winnerId === null && !data.scoredAt && !matchMap.has(doc.id)) {
      lookups.add(doc.id);
    }
  }

  if (lookups.size > 0) {
    const lookupIds = Array.from(lookups).slice(0, 50); // limit to avoid rate limits
    const lookupResults = await Promise.all(
      lookupIds.map(id => getCs2MatchById(id).catch(() => null))
    );
    for (const m of lookupResults) {
      if (m) matchMap.set(m.id, m);
    }
  }

  const uniqueMatches = Array.from(matchMap.values());

  if (uniqueMatches.length > 0) {
    const BATCH_LIMIT = 490;
    for (let i = 0; i < uniqueMatches.length; i += BATCH_LIMIT) {
      const chunk = uniqueMatches.slice(i, i + BATCH_LIMIT);
      const writeBatch = adminDb.batch();
      for (const match of chunk) {
        writeBatch.set(
          adminDb.collection("cs2Matches").doc(match.id),
          { ...match, updatedAt: FieldValue.serverTimestamp() },
          { merge: true }
        );
      }
      await writeBatch.commit();
    }
  }

  // Find remaining true orphans that couldn't be resolved
  const unresolvedOrphans = Array.from(lookups).filter(id => !matchMap.has(id));
  if (unresolvedOrphans.length > 0) {
    const orphanBatch = adminDb.batch();
    for (const id of unresolvedOrphans) {
      orphanBatch.update(adminDb.collection("cs2Matches").doc(id), {
        status: "FINISHED",
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    await orphanBatch.commit();
  }

  return uniqueMatches.length;
}
