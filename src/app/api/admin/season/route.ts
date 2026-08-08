import type { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { closeSeason, ensureActiveSeason, getActiveSeason } from "@/lib/seasons";
import { FieldValue } from "firebase-admin/firestore";

const ADMIN_UID = "wYPtliyEVUTE5OsdG54IpUPq8Jt1";

function getSecret(request: NextRequest): string {
  return (
    request.headers.get("x-sync-secret") ??
    request.nextUrl.searchParams.get("secret") ??
    ""
  );
}

function getAdminUid(request: NextRequest): string {
  return request.headers.get("x-admin-uid") ?? "";
}

export async function GET(request: NextRequest) {
  if (getSecret(request) !== (process.env.SYNC_SECRET ?? "dev")) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!adminDb) return Response.json({ error: "Firestore não configurado" }, { status: 500 });

  const seasons = await adminDb.collection("seasons").orderBy("number", "asc").get();
  return Response.json({
    seasons: seasons.docs.map((d) => ({ id: d.id, ...d.data() })),
  });
}

export async function POST(request: NextRequest) {
  if (getSecret(request) !== (process.env.SYNC_SECRET ?? "dev")) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (getAdminUid(request) !== ADMIN_UID) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!adminDb) return Response.json({ error: "Firestore não configurado" }, { status: 500 });

  const body = await request.json().catch(() => ({}));
  const action = body.action as string;

  if (action === "init") {
    const seasonId = await ensureActiveSeason();
    const season = await getActiveSeason();
    return Response.json({ ok: true, seasonId, season });
  }

  if (action === "close") {
    const activeSeason = await getActiveSeason();
    if (!activeSeason) {
      return Response.json({ error: "Nenhuma season ativa" }, { status: 400 });
    }
    const newSeasonId = await closeSeason(activeSeason.id, ADMIN_UID);
    return Response.json({ ok: true, closedSeasonId: activeSeason.id, newSeasonId });
  }

  if (action === "create") {
    const { name } = body;
    const existing = await getActiveSeason();
    if (existing) {
      return Response.json({ error: "Já existe uma season ativa. Encerre-a primeiro." }, { status: 400 });
    }
    const allSeasonsSnap = await adminDb.collection("seasons").get();
    const nextNumber = allSeasonsSnap.size + 1;
    const ref = await adminDb.collection("seasons").add({
      name: name || `Temporada ${nextNumber} · ${new Date().getFullYear()}`,
      number: nextNumber,
      startDate: new Date().toISOString(),
      endDate: null,
      status: "active",
      createdBy: ADMIN_UID,
      createdAt: FieldValue.serverTimestamp(),
    });
    return Response.json({ ok: true, seasonId: ref.id });
  }

  return Response.json({ error: "Ação desconhecida" }, { status: 400 });
}
