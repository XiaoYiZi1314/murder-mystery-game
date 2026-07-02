import { ADMIN_CAPABILITIES, ADMIN_LEVEL_RULES, type AdminRole } from "./admin-data";

export const MEMBER_SESSION_KEY = "tm_member_session";
export const MEMBER_ACCOUNTS_KEY = "tm_member_accounts";
export const ADMIN_ROLE_KEY = "tm_admin_role";

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatInteger(value: number): string {
  return new Intl.NumberFormat("zh-CN").format(value);
}

export function getRechargeGift(amount: number): number {
  if (amount >= 2000) return 500;
  if (amount >= 1000) return 200;
  if (amount >= 500) return 80;
  if (amount >= 300) return 30;
  return 0;
}

export function getLevelByRecharge(totalRecharge: number) {
  const rules = [...ADMIN_LEVEL_RULES].sort((a, b) => a.min - b.min);
  let matched = rules[0];

  for (const rule of rules) {
    if (totalRecharge >= rule.min) {
      matched = rule;
    }
  }

  return {
    idx: rules.findIndex((rule) => rule.name === matched.name),
    name: matched.name,
    threshold: matched.min,
    discountText: `${matched.discount} 折`,
    discountNumber: Number(matched.discount) / 10,
  };
}

export function getNextLevel(totalRecharge: number) {
  const rules = [...ADMIN_LEVEL_RULES].sort((a, b) => a.min - b.min);
  return rules.find((rule) => rule.min > totalRecharge) ?? null;
}

export function maskPhone(phone: string): string {
  if (!/^1\d{10}$/.test(phone)) return phone;
  return `${phone.slice(0, 3)}****${phone.slice(7)}`;
}

export function isValidPhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone);
}

export function isValidPassword(password: string): boolean {
  return password.trim().length >= 6;
}

export function getCapability(role: AdminRole, capability: string) {
  return ADMIN_CAPABILITIES[capability]?.[role] ?? "n";
}

export function cloneState<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

export function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeStorage(key: string, value: unknown, remember = true) {
  if (typeof window === "undefined") return;

  const serialized = JSON.stringify(value);
  if (remember) {
    window.localStorage.setItem(key, serialized);
    window.sessionStorage.removeItem(key);
  } else {
    window.sessionStorage.setItem(key, serialized);
    window.localStorage.removeItem(key);
  }
}

export function removeStorage(key: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(key);
  window.sessionStorage.removeItem(key);
}
