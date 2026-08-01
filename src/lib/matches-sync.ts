import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { getLiveMatches, getFixturesByDate, getFixtureById } from "@/lib/api-football/client";

const MAX_SYNC_DATES = 5;
const MAX_STALE_LOOKUPS = 15;

function toDateKey(value?: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function collectDateCandidates(set: Set<string>, value?: string | null) {
  const key = toDateKey(value);
  if (!key) return;
  set.add(key);
  const baseDate = new Date(`${key}T00:00:00.000Z`);
  for (const offset of [-1, 0, 1]) {
    const candidate = new Date(baseDate);
    candidate.setDate(baseDate.getDate() + offset);
    set.add(candidate.toISOString().slice(0, 10));
  }
}

export async function syncMatchesFromApi(): Promise<number> {
  if (!adminDb) {
    throw new Error("Firestore não configurado");
  }

  const existingSnap = await adminDb
    .collection("matches")
    .where("status", "in", ["LIVE", "UPCOMING", "OTHER"])
    .limit(400)
    .get();

  const dateCandidates = new Set<string>();
  const now = new Date();

  for (const offset of [-1, 0, 1]) {
    const candidate = new Date(now);
    candidate.setDate(now.getDate() + offset);
    dateCandidates.add(candidate.toISOString().slice(0, 10));
  }

  const staleMatchIds: string[] = [];

  existingSnap.docs.forEach((doc) => {
    const data = doc.data() as { startTime?: string; status?: string };
    collectDateCandidates(dateCandidates, data.startTime);

    if (data.startTime && (data.status === "UPCOMING" || data.status === "LIVE" || data.status === "OTHER")) {
      const startDate = new Date(data.startTime);
      const hoursAgo = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60);
      if (hoursAgo > 3) {
        staleMatchIds.push(doc.id);
      }
    }
  });

  const relevantDates = Array.from(dateCandidates).sort().slice(0, MAX_SYNC_DATES);

  const requests = [getLiveMatches()];
  for (const date of relevantDates) {
    requests.push(getFixturesByDate(date));
  }

  const [liveMatches, ...dateMatches] = await Promise.all(requests);
  const allMatches = [...liveMatches, ...dateMatches.flat()];

  const matchMap = new Map<string, typeof allMatches[0]>();
  for (const m of allMatches) {
    matchMap.set(m.id, m);
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

  if (uniqueMatches.length === 0) {
    return 0;
  }

  const BATCH_LIMIT = 490;
  for (let i = 0; i < uniqueMatches.length; i += BATCH_LIMIT) {
    const chunk = uniqueMatches.slice(i, i + BATCH_LIMIT);
    const batch = adminDb.batch();
    for (const match of chunk) {
      batch.set(
        adminDb.collection("matches").doc(match.id),
        {
          ...match,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }
    await batch.commit();
  }

  return uniqueMatches.length;
}
