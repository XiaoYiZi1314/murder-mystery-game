import {
  MEMBER_SESSION_KEY,
  readStorage,
  removeStorage,
  writeStorage,
} from "@/lib/thirteen-mists/helpers";
import type {
  AdminSession,
  MemberSession,
} from "@/lib/supabase/app-types";

export const ADMIN_SESSION_KEY = "tm_admin_session";

export function getStoredMemberSession() {
  return readStorage<MemberSession | null>(MEMBER_SESSION_KEY, null);
}

export function setStoredMemberSession(session: MemberSession) {
  writeStorage(MEMBER_SESSION_KEY, session, session.remember);
}

export function clearStoredMemberSession() {
  removeStorage(MEMBER_SESSION_KEY);
}

export function getStoredAdminSession() {
  return readStorage<AdminSession | null>(ADMIN_SESSION_KEY, null);
}

export function setStoredAdminSession(session: AdminSession) {
  writeStorage(ADMIN_SESSION_KEY, session, true);
}

export function clearStoredAdminSession() {
  removeStorage(ADMIN_SESSION_KEY);
}
