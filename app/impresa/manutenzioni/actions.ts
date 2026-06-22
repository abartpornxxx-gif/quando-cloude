'use server'

import { prisma } from '@/lib/prisma'
import { requireImpresa } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { TipoImpiantoManutenzione, IntervalloUnita } from '@/app/generated/prisma/client'

// ─── Tipi per useActionState ──────────────────────────────────────────────────
export type PropostaState = { error?: string; success?: boolean }

export async function salvaManutenzione(fd: FormData): Promise<void> {
  await requireImpresa()

  const id = fd.get('id') as string | null
  const clienteId = fd.get('clienteId') as string
  const titolo = (fd.get('titolo') as string).trim()
  const tipoImpianto = fd.get('tipoImpianto') as TipoImpiantoManutenzione
  const tipoImpiantoAltro = tipoImpianto === 'Altro'
    ? ((fd.get('tipoImpiantoAltro') as string) || null)
    : null
  const intervalloValore = parseInt(fd.get('intervalloValore') as string, 10)
  const intervalloUnita = fd.get('intervalloUnita') as IntervalloUnita
  const dataUltimoIntervento = fd.get('dataUltimoIntervento') as string | null
  const dataProssimoIntervento = fd.get('dataProssimoIntervento') as string
  const note = (fd.get('note') as string) || null
  const attiva = fd.get('attiva') === 'true'

  if (!clienteId || !titolo || !tipoImpianto || !intervalloValore || !dataProssimoIntervento) {
    throw new Error('Campi obbligatori mancanti.')
  }

  const data = {
    clienteId,
    titolo,
    tipoImpianto,
    tipoImpiantoAltro,
    intervalloValore,
    intervalloUnita,
    dataUltimoIntervento: dataUltimoIntervento ? new Date(dataUltimoIntervento) : null,
    dataProssimoIntervento: new Date(dataProssimoIntervento),
    note,
    attiva,
  }

  if (id) {
    await prisma.manutenzioneProgrammata.update({ where: { id }, data })
  } else {
    await prisma.manutenzioneProgrammata.create({ data })
  }

  revalidatePath('/impresa/manutenzioni')
  redirect('/impresa/manutenzioni')
}

export async function eliminaManutenzione(id: string): Promise<void> {
  await requireImpresa()
  await prisma.manutenzioneProgrammata.delete({ where: { id } })
  revalidatePath('/impresa/manutenzioni')
}

// ─── Proposte di intervento ───────────────────────────────────────────────────

export async function creaPropostaIntervento(
  _prevState: PropostaState,
  fd: FormData,
): Promise<PropostaState> {
  await requireImpresa()

  const manutenzioneId = fd.get('manutenzioneId') as string
  const dataStr = fd.get('dataPropostaPrevista') as string
  const messaggio = ((fd.get('messaggioImpresa') as string) ?? '').trim() || null

  if (!manutenzioneId || !dataStr) return { error: 'Campi obbligatori mancanti.' }

  const manutenzione = await prisma.manutenzioneProgrammata.findUnique({
    where: { id: manutenzioneId },
    select: { id: true, clienteId: true },
  })
  if (!manutenzione) return { error: 'Manutenzione non trovata.' }

  // Controllo applicativo prima dell'indice unico parziale DB
  const aperta = await prisma.propostaIntervento.findFirst({
    where: { manutenzioneId, stato: { in: ['Inviata', 'VistaDalCliente'] } },
  })
  if (aperta) {
    return { error: 'Esiste già una proposta aperta per questa manutenzione. Annullala prima di crearne una nuova.' }
  }

  try {
    await prisma.propostaIntervento.create({
      data: {
        manutenzioneId,
        clienteId: manutenzione.clienteId,
        stato: 'Inviata',
        dataPropostaPrevista: new Date(dataStr),
        messaggioImpresa: messaggio,
        confermataDaImpresa: false,
      },
    })
  } catch (e: unknown) {
    // Fallback: indice unico parziale DB ha catturato un race condition
    if (e instanceof Error && e.message.includes('proposte_intervento_unica_aperta')) {
      return { error: 'Esiste già una proposta aperta per questa manutenzione.' }
    }
    throw e
  }

  revalidatePath(`/impresa/manutenzioni/${manutenzioneId}`)
  return { success: true }
}

export async function confermaPropostaManualmente(propostaId: string): Promise<void> {
  await requireImpresa()
  const updated = await prisma.propostaIntervento.update({
    where: { id: propostaId },
    data: { stato: 'ConfermataManuale', confermataDaImpresa: true },
    select: { manutenzioneId: true },
  })
  revalidatePath(`/impresa/manutenzioni/${updated.manutenzioneId}`)
  revalidatePath('/impresa/manutenzioni')
}

export async function annullaPropostaIntervento(propostaId: string): Promise<void> {
  await requireImpresa()
  const updated = await prisma.propostaIntervento.update({
    where: { id: propostaId },
    data: { stato: 'Annullata' },
    select: { manutenzioneId: true },
  })
  revalidatePath(`/impresa/manutenzioni/${updated.manutenzioneId}`)
  revalidatePath('/impresa/manutenzioni')
}

export async function creaCommessaDaProposta(propostaId: string): Promise<void> {
  await requireImpresa()

  const proposta = await prisma.propostaIntervento.findUnique({
    where: { id: propostaId },
    include: {
      manutenzione: { select: { id: true, titolo: true } },
    },
  })

  if (!proposta) throw new Error('Proposta non trovata.')

  // Guard: commessa già esistente → redirect alla commessa senza creare duplicati
  if (proposta.commessaId) {
    redirect(`/impresa/commesse/${proposta.commessaId}`)
  }

  // Guard: solo Accettata o ConfermataManuale possono generare una commessa
  if (proposta.stato !== 'Accettata' && proposta.stato !== 'ConfermataManuale') {
    throw new Error(`La proposta è in stato "${proposta.stato}" e non può generare una commessa.`)
  }

  // Nome: "Titolo manutenzione — GG/MM/AAAA"
  const dataFormattata = proposta.dataPropostaPrevista.toLocaleDateString('it-IT')
  const nomeCommessa = `${proposta.manutenzione.titolo} — ${dataFormattata}`

  // Crea commessa con i campi esistenti
  const commessa = await prisma.commessa.create({
    data: {
      nome: nomeCommessa,
      clienteId: proposta.clienteId,
      note: `Creata da proposta di intervento (manutenzione programmata). Proposta: ${propostaId}.`,
    },
  })

  // Collega proposta alla commessa e segna CommessaCreata
  await prisma.propostaIntervento.update({
    where: { id: propostaId },
    data: {
      commessaId: commessa.id,
      stato: 'CommessaCreata',
    },
  })

  // La manutenzione programmata NON viene aggiornata qui:
  // dataUltimoIntervento e dataProssimoIntervento si aggiornano
  // solo quando l'intervento è effettivamente eseguito (fase successiva).

  revalidatePath(`/impresa/manutenzioni/${proposta.manutenzioneId}`)
  revalidatePath('/impresa/manutenzioni')
  revalidatePath('/impresa/notifiche')
  redirect(`/impresa/commesse/${commessa.id}`)
}
