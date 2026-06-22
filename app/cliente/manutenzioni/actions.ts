'use server'

import { prisma } from '@/lib/prisma'
import { requireCliente } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export type RispostaState = { error?: string }

export async function rispondiPropostaCliente(
  _prevState: RispostaState,
  fd: FormData,
): Promise<RispostaState> {
  const { cliente } = await requireCliente()

  const propostaId = fd.get('propostaId') as string
  const azione = fd.get('azione') as string   // 'accetta' | 'rifiuta'
  const rispostaCliente = ((fd.get('rispostaCliente') as string) ?? '').trim() || null

  if (!propostaId || !azione) return { error: 'Dati mancanti.' }

  const proposta = await prisma.propostaIntervento.findUnique({
    where: { id: propostaId },
    select: { clienteId: true, stato: true },
  })

  if (!proposta) return { error: 'Proposta non trovata.' }
  if (proposta.clienteId !== cliente.id) return { error: 'Non autorizzato.' }
  if (!['Inviata', 'VistaDalCliente'].includes(proposta.stato)) {
    return { error: 'Questa proposta non può più essere modificata.' }
  }

  const nuovoStato = azione === 'accetta' ? 'Accettata' : 'RifiutataCliente'

  await prisma.propostaIntervento.update({
    where: { id: propostaId },
    data: { stato: nuovoStato, rispostaCliente },
  })

  revalidatePath('/cliente/manutenzioni')
  return {}
}
