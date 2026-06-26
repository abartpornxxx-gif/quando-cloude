import { prisma } from '@/lib/prisma'

export async function fetchContextData(role: string, pathname: string, email?: string): Promise<any> {
  const parts = pathname.split('/')
  
  if (pathname.includes('/commesse/') || pathname.includes('/lavori/')) {
    const id = parts[parts.length - 1]
    if (id && id.length > 5 && id !== 'nuova' && id !== 'archiviate') {
      try {
        const whereClause: any = { id }
        if (role === 'cliente' && email) {
          whereClause.cliente = { email }
        } else if (role === 'operaio' && email) {
          whereClause.operai = { some: { operaio: { email } } }
        }

        const commessa = await prisma.commessa.findFirst({
          where: whereClause,
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
        const whereClause: any = { id }
        if (role === 'operaio' && email) {
          whereClause.operaio = { email }
        }

        const giornata = await prisma.giornata.findFirst({
          where: whereClause,
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

  if (pathname.includes('/dashboard')) {
    try {
      if (role === 'impresa' || role === 'ufficio') {
        const commesseAperte = await prisma.commessa.count({ where: { stato: 'aperta', archiviata: false } })
        const preventiviDaInviare = await prisma.preventivo.count({ where: { stato: 'bozza' } })
        const ordiniAperti = await prisma.ordineFornitore.count({ where: { stato: { in: ['richiesto', 'ordinato'] } } })
        const fattureDaPagare = await prisma.fatturaPassiva.count({ where: { stato: 'da_pagare' } })
        const fattureDaIncassare = await prisma.fatturaAttiva.count({ where: { stato: { in: ['da_incassare', 'parzialmente_incassata', 'scaduta'] } } })
        
        return {
          dashboard: {
            commesseAperte,
            preventiviDaInviare,
            ordiniAperti,
            fattureDaPagare,
            fattureDaIncassare
          }
        }
      }
    } catch (e) {
      console.error('Error fetching dashboard context:', e)
    }
  }

  return {}
}
