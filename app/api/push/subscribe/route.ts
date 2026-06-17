// ORDINE 4 — API per salvare la subscription push dell'operaio
// Richiamata dal client quando l'utente acconsente alle notifiche push

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { salvaSubscription } from '@/lib/push'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.user_metadata?.role !== 'operaio') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const { subscription } = await request.json()
  if (!subscription?.endpoint) {
    return NextResponse.json({ error: 'Subscription non valida' }, { status: 400 })
  }

  const operaio = user.email
    ? await prisma.operaio.findFirst({ where: { email: user.email }, select: { id: true } })
    : null

  if (!operaio) return NextResponse.json({ error: 'Operaio non trovato' }, { status: 404 })

  await salvaSubscription(operaio.id, subscription)

  return NextResponse.json({ ok: true })
}
