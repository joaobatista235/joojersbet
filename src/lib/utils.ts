import { Timestamp } from "firebase/firestore";

/** Converte Firestore Timestamp, string ISO ou null para string ISO. */
export function tsToISO(ts: unknown): string {
  if (ts instanceof Timestamp) return ts.toDate().toISOString();
  if (typeof ts === "string") return ts;
  return new Date().toISOString();
}

/** Restringe um valor numérico a [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Verifica se uma string não está vazia após trim. */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
