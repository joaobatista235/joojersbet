"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, googleProvider, isConfigured } from "@/lib/firebase";

/* ─── Types ─────────────────────────────────────────────── */
export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL: string | null;
  initials: string;
  city?: string;
  favoriteTeam?: string;
  role: "user" | "admin";
  createdAt?: unknown;
}

interface AuthContextType {
  user: UserProfile | null;
  firebaseUser: User | null;
  loading: boolean;
  firebaseConfigured: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

/* ─── Helpers ───────────────────────────────────────────── */
function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("");
}

async function syncUserToFirestore(fbUser: User): Promise<UserProfile> {
  if (!db) throw new Error("Firestore não configurado");
  const ref = doc(db, "users", fbUser.uid);
  const snap = await getDoc(ref);

  let profile: UserProfile;

  if (!snap.exists()) {
    const newProfile: Omit<UserProfile, "uid"> = {
      name: fbUser.displayName ?? "Jogador",
      email: fbUser.email ?? "",
      photoURL: fbUser.photoURL,
      initials: getInitials(fbUser.displayName ?? "J"),
      role: "user",
      createdAt: serverTimestamp(),
    };
    await setDoc(ref, newProfile);
    profile = { uid: fbUser.uid, ...newProfile };
  } else {
    const data = snap.data() as Omit<UserProfile, "uid">;
    profile = { uid: fbUser.uid, ...data };
  }

  // Desnormalizar nome/foto em userScores para exibição nos rankings de grupo
  const scoreRef = doc(db, "userScores", fbUser.uid);
  await setDoc(
    scoreRef,
    {
      name: profile.name,
      initials: profile.initials,
      photoURL: profile.photoURL,
      city: profile.city ?? null,
    },
    { merge: true }
  );

  return profile;
}

/* ─── Context ───────────────────────────────────────────── */
const AuthContext = createContext<AuthContextType>({
  user: null,
  firebaseUser: null,
  loading: false,
  firebaseConfigured: false,
  signInWithGoogle: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

/* ─── Provider ──────────────────────────────────────────── */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(() => Boolean(isConfigured && auth));

  useEffect(() => {
    if (!isConfigured || !auth) return;

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setFirebaseUser(fbUser);
        try {
          const profile = await syncUserToFirestore(fbUser);
          setUser(profile);
        } catch (err) {
          console.error("Erro ao sincronizar usuário:", err);
        }
      } else {
        setFirebaseUser(null);
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    if (!auth || !googleProvider) {
      throw new Error("Firebase Auth não está configurado. Configure o .env.local.");
    }
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Erro ao entrar com Google:", err);
      throw err;
    }
  };

  const logout = async () => {
    if (auth) await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        loading,
        firebaseConfigured: isConfigured,
        signInWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
