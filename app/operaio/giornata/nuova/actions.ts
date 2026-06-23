'use server'

import { prisma } from '@/lib/prisma'
import { requireOperaio } from '@/lib/auth'

// Restituisce l'URL di destinazione invece di chiamare redirect():
// redirect() dentro una server action propagava come errore in produzione (sanitizzato
// da Next.js a "An error occurred in the Server Components render…"), rendendo impossibile
// distinguere redirect da errore reale nel catch del client.
export async function iniziaGiornata(input: {
  commessaId: string
  mezzoId?: string
  pianificazioneId?: string
  attrezzatureIds: string[]
}): Promise<string> {
  const { operaio } = await requireOperaio()

  // Verifica assegnazione: via CommessaOperaio (permanente) OPPURE via Pianificazione (giornaliera).
  // I tre campi della pianificazione (id + operaioId + commessaId) devono coincidere nel DB
  // per evitare che un operaio possa aprire commesse altrui passando un id a caso.
  const [assegnazione, pianoValido] = await Promise.all([
    prisma.commessaOperaio.findUnique({
      where: { commessaId_operaioId: { commessaId: input.commessaId, operaioId: operaio.id } },
    }),
    input.pianificazioneId
      ? prisma.pianificazione.findFirst({
          where: {
            id: input.pianificazioneId,
            operaioId: operaio.id,
            commessaId: input.commessaId,
          },
        })
      : null,
  ])
  if (!assegnazione && !pianoValido) throw new Error('Non sei assegnato a questa commessa')

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Guard: blocca se esiste già una giornata aperta (qualsiasi data)
  const giornataAperta = await prisma.giornata.findFirst({
    where: {
      operaioId: operaio.id,
      stato: 'bozza',
      fase: { not: 'completata' },
    },
    orderBy: { data: 'desc' },
  })
  if (giornataAperta) return `/operaio/giornata/${giornataAperta.id}/lavori`

  const g = await prisma.giornata.create({
    data: {
      commessaId: input.commessaId,
      operaioId: operaio.id,
      data: today,
      mezzoId: input.mezzoId || null,
      pianificazioneId: input.pianificazioneId || null,
      fase: 'inizio',
      stato: 'bozza',
    },
  })

  // Crea record attrezzatura_usi per ogni attrezzo preso
  if (input.attrezzatureIds.length > 0) {
    await prisma.attrezzaturaUso.createMany({
      data: input.attrezzatureIds.map(attrId => ({
        attrezzaturaId: attrId,
        operaioId: operaio.id,
        commessaId: input.commessaId,
        mezzoId: input.mezzoId || null,
        giornataId: g.id,
        riconsegnata: false,
      })),
    })

    // Segna le attrezzature come in_uso
    await prisma.attrezzatura.updateMany({
      where: { id: { in: input.attrezzatureIds } },
      data: { stato: 'in_uso', assegnatario: operaio.nome },
    })
  }

  return `/operaio/giornata/${g.id}/lavori`
}
