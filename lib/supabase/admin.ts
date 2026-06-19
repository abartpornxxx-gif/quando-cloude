import { createClient } from '@supabase/supabase-js'

// Admin client con service_role key — SOLO server-side (server actions, route API).
// Non importare mai in componenti client, proxy.ts o file con 'use client'.
export function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY non configurato. ' +
      'Aggiungi la variabile in .env.local (sviluppo) e in Vercel → Settings → Environment Variables (produzione). ' +
      'La trovi in: Supabase Dashboard → Project Settings → API → service_role (secret).'
    )
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
