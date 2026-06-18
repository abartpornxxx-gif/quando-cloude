'use server'

import { prisma } from '@/lib/prisma'
import { requireOperaio } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function inviaRapportino(
  giornataId: string,
  input: {
    lavoroEseguito: string
    lavoriExtra?: string
    noteAttrezzatura?: string
    noteGiornoSuccessivo?: string
    oreOrdinarie: number
    oreStraordinarie: number
    attrezzatureIds: string[]
    materialiReso?: Array<{ materialeId: string; descrizione: string; quantita: number }>
    cosaFareDomani?: string
    urgenzaDomani?: number
    stimaOreDomani?: number
  }
): Promise<void> {
  const { operaio } = await requireOperaio()

  const giornata = await prisma.giornata.findUnique({
    where: { id: giornataId },
    include: { commessa: true },
  })
  if (!giornata || giornata.operaioId !== operaio.id) throw new Error('Non autorizzato')
  if (giornata.fase !== 'fine') throw new Error('Il rapportino si compila solo a giornata conclusa')

  await prisma.$transaction(async tx => {
    // Crea rapportino
    await tx.rapportino.create({
      data: {
        giornataId,
        lavoroEseguito: input.lavoroEseguito.trim(),
        lavoriExtra: input.lavoriExtra?.trim() || null,
        noteAttrezzatura: input.noteAttrezzatura?.trim() || null,
        noteGiornoSuccessivo: input.noteGiornoSuccessivo?.trim() || null,
        oreOrdinarie: input.oreOrdinarie,
        oreStraordinarie: input.oreStraordinarie,
        cosaFareDomani: input.cosaFareDomani?.trim() || null,
        urgenzaDomani: input.urgenzaDomani ?? null,
        stimaOreDomani: input.stimaOreDomani ?? null,
      },
    })

    // Crea record ore nella giornata
    if (input.oreOrdinarie > 0) {
      await tx.giornataOra.create({
        data: { giornataId, tipo: 'ordinaria', quantita: input.oreOrdinarie },
      })
    }
    if (input.oreStraordinarie > 0) {
      await tx.giornataOra.create({
        data: { giornataId, tipo: 'straordinaria', quantita: input.oreStraordinarie },
      })
    }

    // Riconsegna attrezzature
    if (input.attrezzatureIds.length > 0) {
      await tx.attrezzaturaUso.updateMany({
        where: { giornataId, attrezzaturaId: { in: input.attrezzatureIds } },
        data: { riconsegnata: true },
      })

      // Controlla se ci sono ancora usi attivi su quelle attrezzature
      for (const attrId of input.attrezzatureIds) {
        const altriUsi = await tx.attrezzaturaUso.count({
          where: { attrezzaturaId: attrId, riconsegnata: false },
        })
        if (altriUsi === 0) {
          await tx.attrezzatura.update({
            where: { id: attrId },
            data: { stato: 'disponibile', assegnatario: null },
          })
        }
      }
    }

    // Aggiorna costi manodopera sulla commessa
    const costoOrario = operaio.costoOrario
    const costoTotale = Math.round(
      input.oreOrdinarie * costoOrario + input.oreStraordinarie * costoOrario * 1.5
    )
    await tx.commessa.update({
      where: { id: giornata.commessaId },
      data: { costiManodopera: { increment: costoTotale } },
    })

    // Reso materiale: crea movimenti di tipo 'reso' in magazzino
    const resiValidi = (input.materialiReso ?? []).filter(r => r.quantita > 0)
    if (resiValidi.length > 0) {
      await tx.movimentoMagazzino.createMany({
        data: resiValidi.map(r => ({
          materialeId: r.materialeId,
          tipo: 'reso' as const,
          quantita: r.quantita,
          descrizione: `Reso da rapportino: ${r.descrizione}`,
          commessaId: giornata.commessaId,
        })),
      })
    }

    // Chiudi giornata
    await tx.giornata.update({
      where: { id: giornataId },
      data: { fase: 'completata', stato: 'inviata', lavoroSvolto: input.lavoroEseguito.trim() },
    })
  })

  revalidatePath(`/operaio/giornata/${giornataId}/rapportino`)
  redirect('/operaio/dashboard')
}
