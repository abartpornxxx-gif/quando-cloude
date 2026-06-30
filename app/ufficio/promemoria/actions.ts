'use server'

import { prisma } from '@/lib/prisma'
import { requireImpresaOUfficio } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

// ── Tipi condivisi ─────────────────────────────────────────────────────────────

type PayloadBase = {
  titolo: string
  descrizione?: string
  luogo?: string
  dataOra: string // ISO UTC string
  assegnatoAOperaioId?: string
  perImpresa: boolean
  importante?: boolean
  priorita?: string
  clienteId?: string
  commessaId?: string
}

// ── Creazione ──────────────────────────────────────────────────────────────────

export async function creaPromemoria(data: PayloadBase) {
  const user = await requireImpresaOUfficio()
  const role = user.user_metadata?.role || 'ufficio'

  const promemoria = await prisma.promemoria.create({
    data: {
      titolo:              data.titolo,
      descrizione:         data.descrizione || null,
      luogo:               data.luogo || null,
      dataOra:             new Date(data.dataOra),
      assegnatoAOperaioId: data.assegnatoAOperaioId || null,
      perImpresa:          data.perImpresa,
      importante:          data.importante || false,
      priorita:            data.priorita || 'normale',
      clienteId:           data.clienteId || null,
      commessaId:          data.commessaId || null,
      tipo:                'intervento',
      stato:               'attivo',
      creatoDa:            role === 'impresa' ? 'Impresa' : 'Ufficio',
    },
  })

  if (data.assegnatoAOperaioId) {
    try {
      const { pushNuovoAppuntamento } = await import('@/lib/push')
      const formattedDate = new Date(data.dataOra).toLocaleString('it-IT', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome',
      })
      await pushNuovoAppuntamento(data.assegnatoAOperaioId, data.titolo, formattedDate, data.luogo || 'Cantiere')
    } catch (pushErr) {
      console.warn('Errore invio push notifica:', pushErr)
    }
  }

  revalidatePath('/ufficio/promemoria')
  revalidatePath('/impresa/dashboard')
  return { success: true, id: promemoria.id }
}

export async function creaPromemoriaAI(data: PayloadBase & {
  tipo?: string
  origineAi?: boolean
  testoOriginaleAi?: string
}) {
  const user = await requireImpresaOUfficio()
  const role = user.user_metadata?.role || 'ufficio'

  await prisma.promemoria.create({
    data: {
      titolo:              data.titolo,
      descrizione:         data.descrizione || null,
      luogo:               data.luogo || null,
      dataOra:             new Date(data.dataOra),
      assegnatoAOperaioId: data.assegnatoAOperaioId || null,
      perImpresa:          data.perImpresa,
      importante:          data.importante || false,
      priorita:            data.priorita || 'normale',
      clienteId:           data.clienteId || null,
      commessaId:          data.commessaId || null,
      tipo:                data.tipo || 'intervento',
      stato:               'attivo',
      creatoDa:            role === 'impresa' ? 'Impresa' : 'Ufficio',
      origineAi:           data.origineAi || false,
      testoOriginaleAi:    data.testoOriginaleAi || null,
    },
  })

  revalidatePath('/ufficio/promemoria')
  revalidatePath('/impresa/dashboard')
  return { success: true }
}

// ── Aggiornamento ──────────────────────────────────────────────────────────────

export async function aggiornaPromemoria(id: string, data: PayloadBase) {
  await requireImpresaOUfficio()

  await prisma.promemoria.update({
    where: { id },
    data: {
      titolo:              data.titolo,
      descrizione:         data.descrizione || null,
      luogo:               data.luogo || null,
      dataOra:             new Date(data.dataOra),
      assegnatoAOperaioId: data.assegnatoAOperaioId || null,
      perImpresa:          data.perImpresa,
      importante:          data.importante || false,
      priorita:            data.priorita || 'normale',
      clienteId:           data.clienteId || null,
      commessaId:          data.commessaId || null,
    },
  })

  revalidatePath('/ufficio/promemoria')
  revalidatePath('/impresa/dashboard')
  revalidatePath('/operaio/dashboard')
  return { success: true }
}

export async function toggleImportante(id: string, importante: boolean) {
  await requireImpresaOUfficio()
  await prisma.promemoria.update({ where: { id }, data: { importante } })
  revalidatePath('/ufficio/promemoria')
  revalidatePath('/impresa/dashboard')
  return { success: true }
}

export async function completaPromemoria(id: string, completato: boolean) {
  await requireImpresaOUfficio()
  await prisma.promemoria.update({
    where: { id },
    data: {
      stato:       completato ? 'completato' : 'attivo',
      completatoAt: completato ? new Date() : null,
    },
  })
  revalidatePath('/ufficio/promemoria')
  revalidatePath('/impresa/dashboard')
  revalidatePath('/operaio/dashboard')
  return { success: true }
}

export async function eliminaPromemoria(id: string) {
  await requireImpresaOUfficio()
  await prisma.promemoria.delete({ where: { id } })
  revalidatePath('/ufficio/promemoria')
  revalidatePath('/impresa/dashboard')
  revalidatePath('/operaio/dashboard')
  return { success: true }
}

// ── Esito e follow-up ─────────────────────────────────────────────────────────

export async function registraEsito(id: string, esitoTesto: string, followUp: boolean) {
  await requireImpresaOUfficio()
  await prisma.promemoria.update({
    where: { id },
    data: {
      esitoTesto,
      esitoRegistratoAt: new Date(),
      followUpRichiesto: followUp,
      stato: 'completato',
      completatoAt: new Date(),
    },
  })
  revalidatePath('/ufficio/promemoria')
  revalidatePath('/impresa/dashboard')
  return { success: true }
}

export async function rimandaPromemoria(id: string, nuovaDataOraISO: string) {
  await requireImpresaOUfficio()
  await prisma.promemoria.update({
    where: { id },
    data: { dataOra: new Date(nuovaDataOraISO), stato: 'attivo' },
  })
  revalidatePath('/ufficio/promemoria')
  revalidatePath('/impresa/dashboard')
  return { success: true }
}

// ── Query ─────────────────────────────────────────────────────────────────────

export async function getPromemoriaFiltro(filtro: 'oggi' | 'futuri' | 'tutti' | 'completati') {
  await requireImpresaOUfficio()
  const now = new Date()
  const inizioOggi = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
  const fineOggi   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)

  let whereClause: Record<string, unknown> = {}
  if (filtro === 'oggi')       whereClause = { dataOra: { gte: inizioOggi, lte: fineOggi }, stato: 'attivo' }
  else if (filtro === 'futuri') whereClause = { dataOra: { gt: fineOggi }, stato: 'attivo' }
  else if (filtro === 'tutti')  whereClause = { stato: 'attivo' }
  else if (filtro === 'completati') whereClause = { stato: 'completato' }

  return prisma.promemoria.findMany({
    where: whereClause,
    include: {
      operaio:  { select: { nome: true } },
      cliente:  { select: { nome: true } },
      commessa: { select: { nome: true } },
    },
    orderBy: { dataOra: 'asc' },
  })
}

export async function getPromemoriaScaduti() {
  await requireImpresaOUfficio()
  const now = new Date()
  return prisma.promemoria.findMany({
    where: {
      stato:  'attivo',
      dataOra: { lt: now },
    },
    include: {
      operaio:  { select: { nome: true } },
      cliente:  { select: { nome: true } },
      commessa: { select: { nome: true } },
    },
    orderBy: { dataOra: 'asc' },
    take: 10,
  })
}

export async function getOperaiDropdown() {
  await requireImpresaOUfficio()
  return prisma.operaio.findMany({ select: { id: true, nome: true }, orderBy: { nome: 'asc' } })
}

export async function getClientiDropdown() {
  await requireImpresaOUfficio()
  return prisma.cliente.findMany({ select: { id: true, nome: true }, orderBy: { nome: 'asc' } })
}

export async function getCommesseDropdown() {
  await requireImpresaOUfficio()
  return prisma.commessa.findMany({
    where: { archiviata: false, stato: 'aperta' },
    select: { id: true, nome: true },
    orderBy: { nome: 'asc' },
  })
}
