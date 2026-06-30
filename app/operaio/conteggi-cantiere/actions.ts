'use server'

import { prisma } from '@/lib/prisma'
import { requireOperaio } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { calcolaPlacche } from '@/lib/conteggio-cantiere-defaults'

export type CircuitoQuadro = {
  descrizione: string
  tipo: string
  amperaggio: string
  curva: string
  poli: string
  tensione: string
  quantita: number
}

export type SalvaConteggioPayload = {
  conteggioId: string
  tipoLavorazione: string
  serieCivile: string
  quantitaMap: Record<string, number>
  circuitiQuadro: CircuitoQuadro[]
  noteOperaio: string
  placcheMontate: boolean
  placcheManuali: number | null
  altroTesto: string
}

export async function salvaConteggioOperaio(payload: SalvaConteggioPayload, invia: boolean) {
  const { operaio } = await requireOperaio()

  const conteggio = await prisma.conteggioCantiere.findFirst({
    where: { id: payload.conteggioId, operaioId: operaio.id },
  })
  if (!conteggio) throw new Error('Conteggio non trovato o non assegnato a te')
  if (conteggio.stato === 'approvato') throw new Error('Il conteggio è già approvato')

  const placcheCalcolate = calcolaPlacche(payload.quantitaMap)

  // Costruisce le righe da salvare
  const righe: {
    categoria: string
    codice?: string
    descrizione: string
    quantita: number
    unita: string
    ordinamento: number
    datiExtra?: object
  }[] = []

  let ord = 0

  // Voci standard (solo quelle con qty > 0)
  for (const [codice, qty] of Object.entries(payload.quantitaMap)) {
    if (qty > 0) {
      righe.push({ categoria: 'STANDARD', codice, descrizione: codice, quantita: qty, unita: 'pz', ordinamento: ord++ })
    }
  }

  // Circuiti quadro
  for (const c of payload.circuitiQuadro) {
    if (c.descrizione.trim() && c.quantita > 0) {
      righe.push({
        categoria: 'QUADRO',
        descrizione: c.descrizione,
        quantita: c.quantita,
        unita: 'pz',
        ordinamento: ord++,
        datiExtra: { tipo: c.tipo, amperaggio: c.amperaggio, curva: c.curva, poli: c.poli, tensione: c.tensione },
      })
    }
  }

  // Lavorazione libera
  if (payload.altroTesto.trim()) {
    righe.push({ categoria: 'ALTRO', descrizione: payload.altroTesto.trim(), quantita: 1, unita: 'pz', ordinamento: ord++ })
  }

  // Sostituisce tutte le righe (delete + create in transaction)
  await prisma.$transaction([
    prisma.conteggioCantiereRiga.deleteMany({ where: { conteggioId: payload.conteggioId } }),
    ...righe.map(r =>
      prisma.conteggioCantiereRiga.create({
        data: {
          conteggioId: payload.conteggioId,
          categoria: r.categoria,
          codice: r.codice || null,
          descrizione: r.descrizione,
          quantita: r.quantita,
          unita: r.unita,
          ordinamento: r.ordinamento,
          datiExtra: r.datiExtra ? (r.datiExtra as object) : undefined,
        },
      })
    ),
    prisma.conteggioCantiere.update({
      where: { id: payload.conteggioId },
      data: {
        tipoLavorazione: payload.tipoLavorazione || null,
        serieCivile: payload.serieCivile || null,
        noteOperaio: payload.noteOperaio || null,
        placcheMontate: payload.placcheMontate,
        placcheCalcolate,
        placcheManuali: payload.placcheManuali,
        stato: invia ? 'inviato' : 'in_compilazione',
        inviatoAt: invia ? new Date() : undefined,
      },
    }),
  ])

  revalidatePath('/operaio/conteggi-cantiere')
  revalidatePath(`/operaio/conteggi-cantiere/${payload.conteggioId}`)
  revalidatePath('/impresa/conteggi-cantiere')
  return { success: true }
}

export async function aggiungiFotoConteggio(conteggioId: string, url: string, path: string, descrizione: string) {
  const { operaio } = await requireOperaio()
  const conteggio = await prisma.conteggioCantiere.findFirst({
    where: { id: conteggioId, operaioId: operaio.id },
  })
  if (!conteggio) throw new Error('Conteggio non trovato')

  await prisma.conteggioCantiereFoto.create({
    data: { conteggioId, url, path, descrizione: descrizione || null },
  })
  revalidatePath(`/operaio/conteggi-cantiere/${conteggioId}`)
}

export async function eliminaFotoConteggio(fotoId: string, conteggioId: string) {
  const { operaio } = await requireOperaio()
  const foto = await prisma.conteggioCantiereFoto.findFirst({
    where: { id: fotoId, conteggioId },
    include: { conteggio: { select: { operaioId: true } } },
  })
  if (!foto || foto.conteggio.operaioId !== operaio.id) throw new Error('Non autorizzato')
  await prisma.conteggioCantiereFoto.delete({ where: { id: fotoId } })
  revalidatePath(`/operaio/conteggi-cantiere/${conteggioId}`)
}
