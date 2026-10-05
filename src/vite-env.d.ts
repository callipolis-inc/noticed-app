/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly VITE_R2_UPLOAD_ENDPOINT?: string;
  readonly VITE_R2_PUBLIC_DOMAIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
