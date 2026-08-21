import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET() {
  if (!adminDb) return NextResponse.json({ error: "no db" });
  let count = 0;
  
  const pResults = await adminDb.collection("predictionResults").get();
  const batch1 = adminDb.batch();
  for (const doc of pResults.docs) {
    const data = doc.data();
    if (data.predictionId && data.pointsEarned !== undefined) {
      batch1.update(adminDb.collection("predictions").doc(data.predictionId), { pointsEarned: data.pointsEarned });
      count++;
    }
  }
  if(count > 0) await batch1.commit();

  let count2 = 0;
  const ufcResults = await adminDb.collection("ufcPredictionResults").get();
  const batch2 = adminDb.batch();
  for (const doc of ufcResults.docs) {
    const data = doc.data();
    if (data.predictionId && data.pointsEarned !== undefined) {
      batch2.update(adminDb.collection("ufcPredictions").doc(data.predictionId), { pointsEarned: data.pointsEarned });
      count2++;
    }
  }
  if(count2 > 0) await batch2.commit();

  let count3 = 0;
  const cs2Results = await adminDb.collection("cs2PredictionResults").get();
  const batch3 = adminDb.batch();
  for (const doc of cs2Results.docs) {
    const data = doc.data();
    if (data.predictionId && data.pointsEarned !== undefined) {
      batch3.update(adminDb.collection("cs2Predictions").doc(data.predictionId), { pointsEarned: data.pointsEarned });
      count3++;
    }
  }
  if(count3 > 0) await batch3.commit();

  return NextResponse.json({ success: true, count: count + count2 + count3 });
}
