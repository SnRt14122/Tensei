import type { SupabaseClient } from "@supabase/supabase-js";

const MISSING_SUPABASE_ENV_ERROR =
  "缺少 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY，本地已降级为离线预览模式。请配置 .env.local 后再使用登录或同步功能。";

export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;

  return { url, anonKey };
}

function unavailableError() {
  return new Error(MISSING_SUPABASE_ENV_ERROR);
}

type UnavailableAuthResult = {
  data: {
    user: null;
    session: null;
  };
  error: Error | null;
};

type UnavailableSupabaseClient = {
  auth: {
    getUser(): Promise<{ data: { user: null }; error: null }>;
    signInWithPassword(): Promise<UnavailableAuthResult>;
    signUp(): Promise<UnavailableAuthResult>;
    signInAnonymously(): Promise<UnavailableAuthResult>;
    signOut(): Promise<{ error: null }>;
  };
};

export function createUnavailableSupabaseClient(): SupabaseClient {
  const client: UnavailableSupabaseClient = {
    auth: {
      async getUser() {
        return { data: { user: null }, error: null };
      },
      async signInWithPassword() {
        return { data: { user: null, session: null }, error: unavailableError() };
      },
      async signUp() {
        return { data: { user: null, session: null }, error: unavailableError() };
      },
      async signInAnonymously() {
        return { data: { user: null, session: null }, error: unavailableError() };
      },
      async signOut() {
        return { error: null };
      },
    },
  };

  return client as unknown as SupabaseClient;
}
