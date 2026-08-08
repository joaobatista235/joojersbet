export const ADMIN_UID = "wYPtliyEVUTE5OsdG54IpUPq8Jt1";

export function isAdmin(uid: string | undefined | null): boolean {
  return uid === ADMIN_UID;
}
