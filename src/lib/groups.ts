import {
  collection,
  doc,
  addDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  query,
  where,
  getDocs,
  getDoc,
  serverTimestamp,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { isNonEmptyString } from "@/lib/utils";

export interface Group {
  id: string;
  name: string;
  inviteCode: string;
  ownerId: string;
  members: string[];   // array de UIDs
  createdAt: string;
}

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem chars ambíguos
  return Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

export async function createGroup(
  name: string,
  ownerId: string
): Promise<Group> {
  if (!db) throw new Error("Firestore não configurado");
  if (!isNonEmptyString(name)) throw new Error("Nome inválido");

  const inviteCode = generateCode();

  const ref = await addDoc(collection(db, "groups"), {
    name: name.trim(),
    inviteCode,
    ownerId,
    members: [ownerId],
    createdAt: serverTimestamp(),
  });

  return {
    id: ref.id,
    name: name.trim(),
    inviteCode,
    ownerId,
    members: [ownerId],
    createdAt: new Date().toISOString(),
  };
}

export async function joinGroupByCode(
  code: string,
  userId: string
): Promise<Group> {
  if (!db) throw new Error("Firestore não configurado");

  const q = query(
    collection(db, "groups"),
    where("inviteCode", "==", code.toUpperCase().trim()),
    limit(1)
  );
  const snap = await getDocs(q);

  if (snap.empty) {
    throw new Error("Código inválido ou grupo não encontrado.");
  }

  const groupDoc = snap.docs[0];
  const data = groupDoc.data();

  if (data.members.includes(userId)) {
    throw new Error("Você já é membro deste grupo.");
  }

  await updateDoc(groupDoc.ref, {
    members: arrayUnion(userId),
  });

  // ─── Evento pro Feed Social ───
  try {
    const userSnap = await getDoc(doc(db, "users", userId));
    if (userSnap.exists()) {
      const userData = userSnap.data();
      await addDoc(collection(db, "feedEvents"), {
        userId: userId,
        user: userData.name || "Jogador",
        initials: userData.initials || "?",
        avatarColor: userData.avatarColor || "#f97316",
        message: `entrou no grupo ${data.name}`,
        createdAt: serverTimestamp(),
      });
    }
  } catch (err) {
    console.warn("Erro ao gerar evento pro feed", err);
  }

  return {
    id: groupDoc.id,
    name: data.name,
    inviteCode: data.inviteCode,
    ownerId: data.ownerId,
    members: [...data.members, userId],
    createdAt:
      data.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
  };
}

export async function leaveGroup(
  groupId: string,
  userId: string
): Promise<void> {
  if (!db) throw new Error("Firestore não configurado");

  const ref = doc(db, "groups", groupId);
  await updateDoc(ref, {
    members: arrayRemove(userId),
  });
}

export async function fetchGroup(groupId: string): Promise<Group | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, "groups", groupId));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    id: snap.id,
    name: d.name,
    inviteCode: d.inviteCode,
    ownerId: d.ownerId,
    members: d.members ?? [],
    createdAt: d.createdAt?.toDate?.()?.toISOString() ?? "",
  };
}
