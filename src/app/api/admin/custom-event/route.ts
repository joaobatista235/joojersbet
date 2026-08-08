import type { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { ADMIN_UID } from "@/lib/admin";

const EXPECTED_SECRET = process.env.SYNC_SECRET ?? "dev";

function auth(request: NextRequest): boolean {
  const secret = request.headers.get("x-sync-secret") ?? request.nextUrl.searchParams.get("secret") ?? "";
  const uid = request.headers.get("x-admin-uid") ?? "";
  return secret === EXPECTED_SECRET && uid === ADMIN_UID;
}

export async function GET(request: NextRequest) {
  if (!auth(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!adminDb) return Response.json({ error: "Firestore não configurado" }, { status: 500 });

  const snap = await adminDb.collection("customEvents").orderBy("createdAt", "desc").get();
  return Response.json({ events: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
}

export async function POST(request: NextRequest) {
  if (!auth(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!adminDb) return Response.json({ error: "Firestore não configurado" }, { status: 500 });

  const body = await request.json().catch(() => ({}));
  const { title, description, options, deadline } = body;

  if (!title || !options || !Array.isArray(options) || options.length < 2) {
    return Response.json({ error: "Dados inválidos: título e pelo menos 2 opções são obrigatórias" }, { status: 400 });
  }

  const ref = await adminDb.collection("customEvents").add({
    title,
    description: description ?? "",
    options,
    deadline: deadline ?? null,
    status: "open",
    resolvedOption: null,
    createdBy: ADMIN_UID,
    createdAt: FieldValue.serverTimestamp(),
  });

  return Response.json({ ok: true, eventId: ref.id });
}

export async function PATCH(request: NextRequest) {
  if (!auth(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!adminDb) return Response.json({ error: "Firestore não configurado" }, { status: 500 });

  const body = await request.json().catch(() => ({}));
  const { eventId, resolvedOption } = body;

  if (!eventId || !resolvedOption) {
    return Response.json({ error: "eventId e resolvedOption são obrigatórios" }, { status: 400 });
  }

  const eventRef = adminDb.collection("customEvents").doc(eventId);
  const eventSnap = await eventRef.get();
  if (!eventSnap.exists) return Response.json({ error: "Evento não encontrado" }, { status: 404 });

  await eventRef.update({ status: "resolved", resolvedOption, resolvedAt: FieldValue.serverTimestamp() });

  const predsSnap = await adminDb.collection("customPredictions").where("eventId", "==", eventId).get();

  let processed = 0;
  const batch = adminDb.batch();
  const affectedUsers = new Set<string>();

  for (const pred of predsSnap.docs) {
    const d = pred.data();
    const correct = d.chosenOption === resolvedOption;
    const pointsEarned = correct ? 15 : 0;

    const resultId = `${eventId}_${d.userId}`;
    batch.set(adminDb.collection("customPredictionResults").doc(resultId), {
      predictionId: pred.id,
      userId: d.userId,
      eventId,
      chosenOption: d.chosenOption,
      resolvedOption,
      correct,
      pointsEarned,
      processedAt: FieldValue.serverTimestamp(),
    });

    if (correct) {
      const userSnap = await adminDb.collection("users").doc(d.userId).get();
      if (userSnap.exists) {
        const u = userSnap.data()!;
        const ev = eventSnap.data()!;
        batch.set(adminDb.collection("feedEvents").doc(`custom_${eventId}_${d.userId}`), {
          userId: d.userId,
          user: u.name || "Jogador",
          initials: u.initials || "?",
          photoURL: u.photoURL || null,
          message: `acertou na aposta "${ev.title}" — ${resolvedOption}`,
          createdAt: FieldValue.serverTimestamp(),
        });
      }
    }

    batch.update(pred.ref, { locked: true });
    affectedUsers.add(d.userId);
    processed++;
  }

  await batch.commit();

  return Response.json({ ok: true, processed, affectedUsers: affectedUsers.size });
}

export async function DELETE(request: NextRequest) {
  if (!auth(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!adminDb) return Response.json({ error: "Firestore não configurado" }, { status: 500 });

  const { searchParams } = request.nextUrl;
  const eventId = searchParams.get("eventId");
  if (!eventId) return Response.json({ error: "eventId é obrigatório" }, { status: 400 });

  await adminDb.collection("customEvents").doc(eventId).delete();
  return Response.json({ ok: true });
}
