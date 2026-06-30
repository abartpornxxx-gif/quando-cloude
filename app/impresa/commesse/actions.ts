'use server'

import { prisma } from '@/lib/prisma'
import { requireImpresa } from '@/lib/auth'
import { euroToCents } from '@/lib/format'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { StatoCommessa } from '@/app/generated/prisma/client'
import { creaNodiStrutturaDaTemplate } from '@/lib/cantiere-struttura/genera-struttura'

export async function salvaCommessa(formData: FormData) {
  await requireImpresa()
  const id = formData.get('id') as string | null
  const tipoLavoroId = (formData.get('tipoLavoroId') as string) || null
  const tipoStruttura = (formData.get('tipoStruttura') as string) || 'commessa_semplice'

  const data = {
    nome: formData.get('nome') as string,
    clienteId: (formData.get('clienteId') as string) || null,
    indirizzoCantiere: (formData.get('indirizzoCantiere') as string) || null,
    stato: formData.get('stato') as StatoCommessa,
    preventivato: euroToCents(formData.get('preventivato') as string),
    costiMateriali: euroToCents(formData.get('costiMateriali') as string),
    costiManodopera: euroToCents(formData.get('costiManodopera') as string),
    costiMezzi: euroToCents(formData.get('costiMezzi') as string),
    fatturato: euroToCents(formData.get('fatturato') as string),
    avanzamentoPercentuale: Math.min(100, Math.max(0, parseInt(formData.get('avanzamentoPercentuale') as string || '0', 10))),
    note: (formData.get('note') as string) || null,
    istruzioniCantiere: (formData.get('istruzioniCantiere') as string) || null,
    attrezzatureNecessarie: (formData.get('attrezzatureNecessarie') as string) || null,
    tipoLavoroId,
    tipoStruttura,
  }

  if (id) {
    // Guard: blocca chiusura se la commessa non è saldata
    if (data.stato === 'chiusa') {
      const [fatturePendenti, commessaDb] = await Promise.all([
        prisma.fatturaAttiva.count({
          where: { commessaId: id, stato: { in: ['da_incassare', 'parzialmente_incassata', 'scaduta'] } },
        }),
        prisma.commessa.findUnique({
          where: { id },
          select: { preventivato: true, fatturato: true },
        }),
      ])
      const nonSaldato =
        fatturePendenti > 0 ||
        (commessaDb !== null &&
          commessaDb.preventivato > 0 &&
          commessaDb.fatturato < commessaDb.preventivato)
      if (nonSaldato) {
        redirect(`/impresa/commesse/${id}?errore=non_saldato`)
      }
    }

    await prisma.commessa.update({ where: { id }, data })
    revalidatePath(`/impresa/commesse/${id}`)
    redirect('/impresa/commesse')
  } else {
    const c = await prisma.commessa.create({ data })

    // Auto-applica la checklist se è stato scelto un tipo lavoro
    if (tipoLavoroId) {
      const modelli = await prisma.adempimentoModello.findMany({
        where: { tipoLavoroId },
        orderBy: [{ ordine: 'asc' }, { createdAt: 'asc' }],
      })
      if (modelli.length > 0) {
        await prisma.adempimentoCommessa.createMany({
          data: modelli.map(m => ({
            commessaId: c.id,
            modelloId: m.id,
            testo: m.testo,
            note: m.note,
            collegamento: m.collegamento,
            ordine: m.ordine,
          })),
        })
      }
    }

    // Auto-crea struttura cantiere se richiesta
    if (tipoStruttura === 'condominio_parco') {
      try {
        const scaleJson = formData.get('struttura_scale') as string | null
        const scale = scaleJson ? (JSON.parse(scaleJson) as string[]) : []
        if (scale.length > 0) {
          const apx = Math.min(20, Math.max(1, parseInt(formData.get('struttura_apx') as string || '4', 10)))
          const conBox = formData.get('struttura_box') === 'true'
          const conEsterno = formData.get('struttura_esterno') === 'true'
          const conAreaComune = formData.get('struttura_area_comune') === 'true'
          await creaNodiStrutturaDaTemplate(c.id, { scale, appartamentiPerScala: apx, conBox, conEsterno, conAreaComune })
        }
      } catch {
        // struttura non creata — l'utente può crearla manualmente dalla pagina struttura
      }
    }

    redirect(`/impresa/commesse/${c.id}`)
  }
}

export async function segnaCantierefinito(id: string) {
  await requireImpresa()
  await prisma.commessa.update({
    where: { id },
    data: { stato: 'finita' },
  })
  revalidatePath(`/impresa/commesse/${id}`)
  revalidatePath('/impresa/commesse')
  revalidatePath('/ufficio/saldi-pendenti')
  revalidatePath('/ufficio/dashboard')
  revalidatePath('/ufficio/notifiche')
}

export async function archiviaCommessa(id: string) {
  await requireImpresa()
  await prisma.commessa.update({ where: { id }, data: { archiviata: true } })
  revalidatePath('/impresa/commesse')
  revalidatePath('/impresa/commesse/archiviate')
  revalidatePath('/ufficio/saldi-pendenti')
  revalidatePath('/ufficio/dashboard')
}

export async function ripristinaCommessa(id: string) {
  await requireImpresa()
  await prisma.commessa.update({ where: { id }, data: { archiviata: false } })
  revalidatePath('/impresa/commesse')
  revalidatePath('/impresa/commesse/archiviate')
  revalidatePath('/ufficio/saldi-pendenti')
  revalidatePath('/ufficio/dashboard')
}

export async function assegnaOperaio(commessaId: string, operaioId: string) {
  await requireImpresa()
  await prisma.commessaOperaio.upsert({
    where: { commessaId_operaioId: { commessaId, operaioId } },
    create: { commessaId, operaioId },
    update: {},
  })
  revalidatePath(`/impresa/commesse/${commessaId}`)
}

export async function rimuoviAssegnazione(commessaId: string, operaioId: string) {
  await requireImpresa()
  await prisma.commessaOperaio.delete({
    where: { commessaId_operaioId: { commessaId, operaioId } },
  })
  revalidatePath(`/impresa/commesse/${commessaId}`)
}
