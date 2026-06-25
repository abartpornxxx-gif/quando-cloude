'use server'

import { prisma } from '@/lib/prisma'
import { requireUfficio } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function creaPromemoria(data: {
  titolo: string
  descrizione?: string
  luogo?: string
  dataOra: string // ISO string
  assegnatoAOperaioId?: string
  perImpresa: boolean
}) {
  await requireUfficio()

  const promemoria = await prisma.promemoria.create({
    data: {
      titolo: data.titolo,
      descrizione: data.descrizione || null,
      luogo: data.luogo || null,
      dataOra: new Date(data.dataOra),
      assegnatoAOperaioId: data.assegnatoAOperaioId || null,
      perImpresa: data.perImpresa,
      tipo: 'intervento',
      stato: 'attivo',
      creatoDa: 'Ufficio',
    },
  })

  // Invia notifica push all'operaio se assegnato
  if (data.assegnatoAOperaioId) {
    try {
      const { pushNuovoAppuntamento } = await import('@/lib/push')
      const formattedDate = new Date(data.dataOra).toLocaleString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
      await pushNuovoAppuntamento(
        data.assegnatoAOperaioId,
        data.titolo,
        formattedDate,
        data.luogo || 'Cantiere'
      )
    } catch (pushErr) {
      console.warn('Errore invio push notifica:', pushErr)
    }
  }

  revalidatePath('/ufficio/promemoria')
  revalidatePath('/impresa/dashboard')
  return { success: true, id: promemoria.id }
}

export async function completaPromemoria(id: string, completato: boolean) {
  await prisma.promemoria.update({
    where: { id },
    data: {
      stato: completato ? 'completato' : 'attivo',
      completatoAt: completato ? new Date() : null,
    },
  })

  revalidatePath('/ufficio/promemoria')
  revalidatePath('/impresa/dashboard')
  revalidatePath('/operaio/dashboard')
  return { success: true }
}

export async function eliminaPromemoria(id: string) {
  await prisma.promemoria.delete({
    where: { id },
  })

  revalidatePath('/ufficio/promemoria')
  revalidatePath('/impresa/dashboard')
  revalidatePath('/operaio/dashboard')
  return { success: true }
}

export async function getPromemoriaFiltro(filtro: 'oggi' | 'futuri' | 'completati') {
  const now = new Date()
  const inizioOggi = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
  const fineOggi = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)

  let whereClause: any = {}

  if (filtro === 'oggi') {
    whereClause = {
      dataOra: {
        gte: inizioOggi,
        lte: fineOggi,
      },
      stato: 'attivo',
    }
  } else if (filtro === 'futuri') {
    whereClause = {
      dataOra: {
        gt: fineOggi,
      },
      stato: 'attivo',
    }
  } else if (filtro === 'completati') {
    whereClause = {
      stato: 'completato',
    }
  }

  return await prisma.promemoria.findMany({
    where: whereClause,
    include: {
      operaio: {
        select: {
          nome: true,
        },
      },
    },
    orderBy: {
      dataOra: 'asc',
    },
  })
}
