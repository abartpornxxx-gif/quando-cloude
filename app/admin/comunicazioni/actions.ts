'use server'
import { requireSuperAdmin } from '@/lib/auth'
import { getAdminClient } from '@/lib/supabase/admin'

export async function inviaComunicazione({
  ruoloTarget,
  oggetto,
  messaggio,
}: {
  ruoloTarget: string
  oggetto: string
  messaggio: string
}): Promise<{ inviati: number }> {
  await requireSuperAdmin()

  const admin = getAdminClient()
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 500 })
  const users = data?.users || []

  const destinatari =
    ruoloTarget === 'tutti'
      ? users
      : users.filter((u) => u.user_metadata?.role === ruoloTarget)

  // Stub: log in console (attivare con Resend quando disponibile)
  console.log(`[BROADCAST] Invio a ${destinatari.length} utenti`)
  console.log(`Oggetto: ${oggetto}`)
  console.log(`Ruolo target: ${ruoloTarget}`)
  // TODO_RESEND: qui va la chiamata a resend.emails.send() per ogni destinatario

  return { inviati: destinatari.length }
}
