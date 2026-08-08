import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { getUpcomingUfcFights, getLiveUfcFights, getPastUfcFights } from "@/lib/api-mma/client";
import type { UfcFight } from "@/lib/api-mma/types";

export async function syncUfcFights(): Promise<number> {
  if (!adminDb) throw new Error("Firestore não configurado");

  const [upcoming, live, past] = await Promise.all([
    getUpcomingUfcFights(),
    getLiveUfcFights(),
    getPastUfcFights(),
  ]);

  const matchMap = new Map<string, UfcFight>();
  for (const f of [...upcoming, ...live, ...past]) matchMap.set(f.id, f);

  const now = new Date();
  const staleSnap = await adminDb
    .collection("ufcFights")
    .where("status", "in", ["LIVE", "UPCOMING", "OTHER"])
    .limit(200)
    .get();

  const orphanIds: string[] = [];
  for (const doc of staleSnap.docs) {
    if (!matchMap.has(doc.id)) {
      const data = doc.data() as { startTime?: string };
      if (data.startTime) {
        const hoursAgo = (now.getTime() - new Date(data.startTime).getTime()) / (1000 * 60 * 60);
        if (hoursAgo > 6) orphanIds.push(doc.id);
      }
    }
  }

  const uniqueFights = Array.from(matchMap.values());

  if (uniqueFights.length > 0) {
    const BATCH_LIMIT = 490;
    for (let i = 0; i < uniqueFights.length; i += BATCH_LIMIT) {
      const chunk = uniqueFights.slice(i, i + BATCH_LIMIT);
      const batch = adminDb.batch();
      for (const fight of chunk) {
        batch.set(
          adminDb.collection("ufcFights").doc(fight.id),
          { ...fight, updatedAt: FieldValue.serverTimestamp() },
          { merge: true }
        );
      }
      await batch.commit();
    }
  }

  if (orphanIds.length > 0) {
    const orphanBatch = adminDb.batch();
    for (const id of orphanIds) {
      orphanBatch.update(adminDb.collection("ufcFights").doc(id), {
        status: "FINISHED",
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    await orphanBatch.commit();
  }

  return uniqueFights.length;
}
