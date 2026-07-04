/**
 * Atribuição client-side (promoter + UTMs).
 *
 * Lê da URL atual, persiste em sessionStorage e devolve um objeto pronto
 * para passar em <Link search={...}>. Preserva atribuição entre Home →
 * Hotsite → Notícia → Experiência sem depender de globals nem contexto.
 *
 * SSR-safe: em servidor retorna {} vazio. Só popula no client.
 */

import { useEffect, useState } from "react";

export type Attribution = {
  promoter?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
};

const KEY = "pf:attribution";
const KEYS: (keyof Attribution)[] = [
  "promoter",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
];

function clean(v: string | null): string | undefined {
  if (!v) return undefined;
  const t = v.trim();
  if (!t) return undefined;
  return t.slice(0, 120);
}

function readFromLocation(): Attribution {
  if (typeof window === "undefined") return {};
  const sp = new URLSearchParams(window.location.search);
  const out: Attribution = {};
  for (const k of KEYS) {
    const v = clean(sp.get(k));
    if (v) out[k] = v;
  }
  return out;
}

function readFromStorage(): Attribution {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Attribution = {};
    for (const k of KEYS) {
      const v = clean(typeof parsed[k] === "string" ? (parsed[k] as string) : null);
      if (v) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

function persist(a: Attribution) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(a));
  } catch {
    /* ignore */
  }
}

/**
 * Hook client-only. Retorna a atribuição atual (URL > sessionStorage).
 * Em SSR retorna {} e hidrata sem causar mismatch (não renderiza no HTML).
 */
export function useAttribution(): Attribution {
  const [attribution, setAttribution] = useState<Attribution>({});
  useEffect(() => {
    const fromUrl = readFromLocation();
    if (Object.keys(fromUrl).length > 0) {
      persist(fromUrl);
      setAttribution(fromUrl);
      return;
    }
    const fromStorage = readFromStorage();
    if (Object.keys(fromStorage).length > 0) {
      setAttribution(fromStorage);
    }
  }, []);
  return attribution;
}

/** Devolve um objeto pronto para <Link search={...}>. */
export function buildSearch(a: Attribution): Attribution {
  const out: Attribution = {};
  for (const k of KEYS) {
    if (a[k]) out[k] = a[k];
  }
  return out;
}
