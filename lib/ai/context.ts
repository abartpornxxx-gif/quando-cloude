import { prisma } from '@/lib/prisma'

export async function fetchContextData(role: string, pathname: string): Promise<any> {
  const parts = pathname.split('/')
  
  if (pathname.includes('/commesse/') || pathname.includes('/lavori/')) {
    const id = parts[parts.length - 1]
    if (id && id.length > 5 && id !== 'nuova' && id !== 'archiviate') {
      try {
        const commessa = await prisma.commessa.findUnique({
          where: { id },
          include: {
            cliente: { select: { nome: true } },
            varianti: true,
            richiestePreventiviFornitori: {
              include: { fornitore: { select: { nome: true } } }
            }
          }
        })
        return { commessa }
      } catch (e) {
        console.error('Error fetching commessa context:', e)
      }
    }
  }

  if (pathname.includes('/giornata/')) {
    const id = parts[parts.length - 1]
    if (id && id.length > 5 && id !== 'nuova') {
      try {
        const giornata = await prisma.giornata.findUnique({
          where: { id },
          include: {
            commessa: { select: { nome: true } },
            rapportino: true
          }
        })
        return { giornata }
      } catch (e) {
        console.error('Error fetching giornata context:', e)
      }
    }
  }

  if (pathname.includes('/richieste/')) {
    const id = parts[parts.length - 1]
    if (id && id.length > 5) {
      try {
        const richiestaPreventivo = await prisma.richiestaPreventivoFornitore.findUnique({
          where: { id },
          include: {
            fornitore: { select: { nome: true } }
          }
        })
        return { richiestaPreventivo }
      } catch (e) {
        console.error('Error fetching request context:', e)
      }
    }
  }

  return {}
}
