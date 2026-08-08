import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export interface Season {
  id: string;
  name: string;
  startDate: string;
  endDate: string | null;
  status: "active" | "closed";
  createdBy: string;
  number: number;
}

export async function getActiveSeason(): Promise<Season | null> {
  if (!adminDb) return null;
  const snap = await adminDb
    .collection("seasons")
    .where("status", "==", "active")
    .limit(1)
    .get();
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as Season;
}

export async function ensureActiveSeason(): Promise<string> {
  const active = await getActiveSeason();
  if (active) return active.id;

  const ref = await adminDb!.collection("seasons").add({
    name: "Temporada 1 · 2026",
    number: 1,
    startDate: new Date().toISOString(),
    endDate: null,
    status: "active",
    createdBy: "system",
    createdAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function closeSeason(seasonId: string, adminUid: string): Promise<string> {
  if (!adminDb) throw new Error("Firestore não configurado");

  const scoresSnap = await adminDb.collection("userScores").get();

  const snapshotBatch = adminDb.batch();
  for (const doc of scoresSnap.docs) {
    const ref = adminDb
      .collection("seasonScores")
      .doc(seasonId)
      .collection("users")
      .doc(doc.id);
    snapshotBatch.set(ref, {
      ...doc.data(),
      snapshotAt: FieldValue.serverTimestamp(),
    });
  }
  snapshotBatch.update(adminDb.collection("seasons").doc(seasonId), {
    status: "closed",
    endDate: new Date().toISOString(),
    closedBy: adminUid,
  });
  await snapshotBatch.commit();

  const allSeasonsSnap = await adminDb.collection("seasons").get();
  const nextNumber = allSeasonsSnap.size + 1;
  const year = new Date().getFullYear();

  const newSeasonRef = await adminDb.collection("seasons").add({
    name: `Temporada ${nextNumber} · ${year}`,
    number: nextNumber,
    startDate: new Date().toISOString(),
    endDate: null,
    status: "active",
    createdBy: adminUid,
    createdAt: FieldValue.serverTimestamp(),
  });

  const resetBatch = adminDb.batch();
  for (const doc of scoresSnap.docs) {
    const data = doc.data();
    resetBatch.set(
      doc.ref,
      {
        name: data.name ?? null,
        initials: data.initials ?? null,
        photoURL: data.photoURL ?? null,
        city: data.city ?? null,
        totalPoints: 0,
        totalPredictions: 0,
        correctPredictions: 0,
        accuracy: 0,
        position: null,
        pendingPredictions: 0,
        updatedAt: new Date().toISOString(),
      },
      { merge: false }
    );
  }
  await resetBatch.commit();

  return newSeasonRef.id;
}
