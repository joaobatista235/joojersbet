import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { getLiveMatches, getFixturesByDate, getFixtureById } from "@/lib/api-football/client";
import type { Match } from "@/lib/api-football/types";

const PROACTIVE_DAYS_AHEAD = 7;
const PROACTIVE_DAYS_BEHIND = 1;
const MAX_STALE_LOOKUPS = 20;

function toDateKey(value?: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

export async function syncMatchesFromApi(): Promise<number> {
  if (!adminDb) {
    throw new Error("Firestore não configurado");
  }

  const now = new Date();

  const dateCandidates = new Set<string>();
  for (let offset = -PROACTIVE_DAYS_BEHIND; offset <= PROACTIVE_DAYS_AHEAD; offset++) {
    const candidate = new Date(now);
    candidate.setDate(now.getDate() + offset);
    dateCandidates.add(candidate.toISOString().slice(0, 10));
  }

  const existingSnap = await adminDb
    .collection("matches")
    .where("status", "in", ["LIVE", "UPCOMING", "OTHER"])
    .limit(400)
    .get();

  const staleMatchIds: string[] = [];

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
      if (hoursAgo > 3) {
        staleMatchIds.push(doc.id);
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

  if (uniqueMatches.length === 0) {
    return 0;
  }

  const BATCH_LIMIT = 490;
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

  return uniqueMatches.length;
}
