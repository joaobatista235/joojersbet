const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

// Configurar o App com as credenciais locais
if (getApps().length === 0) {
  const serviceAccount = require("./firebase-admin.json");
  initializeApp({
    credential: cert(serviceAccount)
  });
}

const db = getFirestore();

async function run() {
  console.log("Starting backfill...");

  // 1. FUTEBOL
  console.log("Backfilling football...");
  const pResults = await db.collection("predictionResults").get();
  for (const doc of pResults.docs) {
    const data = doc.data();
    if (data.predictionId && data.pointsEarned !== undefined) {
      await db.collection("predictions").doc(data.predictionId).update({
        pointsEarned: data.pointsEarned
      }).catch(() => {}); // Ignore missing predictions
    }
  }

  // 2. UFC
  console.log("Backfilling UFC...");
  const ufcResults = await db.collection("ufcPredictionResults").get();
  for (const doc of ufcResults.docs) {
    const data = doc.data();
    if (data.predictionId && data.pointsEarned !== undefined) {
      await db.collection("ufcPredictions").doc(data.predictionId).update({
        pointsEarned: data.pointsEarned
      }).catch(() => {});
    }
  }

  // 3. CS2
  console.log("Backfilling CS2...");
  const cs2Results = await db.collection("cs2PredictionResults").get();
  for (const doc of cs2Results.docs) {
    const data = doc.data();
    if (data.predictionId && data.pointsEarned !== undefined) {
      await db.collection("cs2Predictions").doc(data.predictionId).update({
        pointsEarned: data.pointsEarned
      }).catch(() => {});
    }
  }

  console.log("Backfill complete!");
}

run();
