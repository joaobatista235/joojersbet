import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { getLiveMatches, getFixturesByDate } from "@/lib/api-football/client";

const MAX_SYNC_DATES = 5;

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

  existingSnap.docs.forEach((doc) => {
    const data = doc.data() as { startTime?: string };
    collectDateCandidates(dateCandidates, data.startTime);
  });

  const relevantDates = Array.from(dateCandidates).sort().slice(0, MAX_SYNC_DATES);

  const requests = [getLiveMatches()];
  for (const date of relevantDates) {
    requests.push(getFixturesByDate(date));
  }

  const [liveMatches, ...dateMatches] = await Promise.all(requests);
  const matches = [...liveMatches, ...dateMatches.flat()];
  const uniqueMatches = matches.filter((match, index, arr) => {
    return arr.findIndex((candidate) => candidate.id === match.id) === index;
  });

  if (uniqueMatches.length === 0) {
    return 0;
  }

  const batch = adminDb.batch();

  for (const match of uniqueMatches) {
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
  return uniqueMatches.length;
}
