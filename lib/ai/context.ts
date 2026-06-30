import { prisma } from '@/lib/prisma'

function extractId(parts: string[]): string | null {
  const id = parts[parts.length - 1]
  if (id && id.length > 8 && id !== 'nuova' && id !== 'nuovo' && id !== 'archiviate' && id !== 'stampa' && id !== 'importa') {
    return id
  }
  return null
}

export async function fetchContextData(role: string, pathname: string, email?: string): Promise<any> {
  const parts = pathname.split('/').filter(Boolean)

  // ── Commessa detail ──────────────────────────────────────────────────────────
  if (pathname.match(/\/(commesse|lavori)\/[^/]+$/) || pathname.match(/\/(commesse|lavori)\/[^/]+\//)) {
    const id = parts.find(p => p.length > 8 && !['commesse','lavori','materiali','adempimenti','note'].includes(p))
    if (id) {
      try {
        const whereClause: any = { id }
        if (role === 'cliente' && email) whereClause.cliente = { email }
        else if (role === 'operaio' && email) whereClause.operai = { some: { operaio: { email } } }

        const commessa = await prisma.commessa.findFirst({
          where: whereClause,
          include: {
            cliente: { select: { nome: true, telefono: true } },
            varianti: { select: { titolo: true, importo: true, stato: true, visibileCliente: true } },
            richiestePreventiviFornitori: { include: { fornitore: { select: { nome: true } } } },
            adempimenti: { select: { testo: true, fatto: true, collegamento: true } },
            giornate: { select: { data: true, stato: true }, orderBy: { data: 'desc' }, take: 5 },
            strutturaNodi: {
              where: { attivo: true },
              select: { id: true, tipo: true, nome: true, parentId: true },
              orderBy: [{ ordinamento: 'asc' }, { nome: 'asc' }],
            },
          }
        })
        return { commessa }
      } catch (e) { console.error('AI context commessa:', e) }
    }
  }

  // ── Giornata detail ──────────────────────────────────────────────────────────
  if (pathname.includes('/giornata/')) {
    const id = extractId(parts)
    if (id) {
      try {
        const whereClause: any = { id }
        if (role === 'operaio' && email) whereClause.operaio = { email }

        const giornata = await prisma.giornata.findFirst({
          where: whereClause,
          include: {
            commessa: {
              select: {
                nome: true, indirizzoCantiere: true, istruzioniCantiere: true,
                strutturaNodi: {
                  where: { attivo: true },
                  select: { id: true, tipo: true, nome: true, parentId: true },
                  orderBy: [{ ordinamento: 'asc' }, { nome: 'asc' }],
                },
              },
            },
            rapportino: { select: { lavoroEseguito: true, lavoriExtra: true, noteAttrezzatura: true } },
            materiali: { select: { descrizione: true, quantita: true } },
            ore: { select: { tipo: true, quantita: true } },
          }
        })
        return { giornata }
      } catch (e) { console.error('AI context giornata:', e) }
    }
  }

  // ── Fattura attiva detail ────────────────────────────────────────────────────
  if (pathname.includes('/fatture/') && !pathname.includes('passive')) {
    const id = extractId(parts)
    if (id && role !== 'operaio' && role !== 'magazziniere') {
      try {
        const fattura = await prisma.fatturaAttiva.findUnique({
          where: { id },
          include: {
            cliente: { select: { nome: true } },
            commessa: { select: { nome: true } },
            righe: { select: { descrizione: true, quantita: true, prezzoUnitario: true } },
          }
        })
        return { fattura }
      } catch (e) { console.error('AI context fattura:', e) }
    }
  }

  // ── Fattura passiva detail ───────────────────────────────────────────────────
  if (pathname.includes('/fatture-passive/')) {
    const id = extractId(parts)
    if (id && role !== 'operaio' && role !== 'magazziniere') {
      try {
        const fatturaPassiva = await prisma.fatturaPassiva.findUnique({
          where: { id },
          include: {
            fornitore: { select: { nome: true } },
            commessa: { select: { nome: true } },
          }
        })
        return { fatturaPassiva }
      } catch (e) { console.error('AI context fatturaPassiva:', e) }
    }
  }

  // ── Preventivo detail ────────────────────────────────────────────────────────
  if (pathname.includes('/preventivi/')) {
    const id = extractId(parts)
    if (id && role !== 'operaio' && role !== 'magazziniere') {
      try {
        const preventivo = await prisma.preventivo.findUnique({
          where: { id },
          include: {
            cliente: { select: { nome: true } },
            righe: { select: { descrizione: true, quantita: true, prezzoUnitario: true } },
          }
        })
        return { preventivo }
      } catch (e) { console.error('AI context preventivo:', e) }
    }
  }

  // ── Ordine fornitore detail ──────────────────────────────────────────────────
  if (pathname.includes('/ordini/')) {
    const id = extractId(parts)
    if (id && role !== 'operaio' && role !== 'cliente') {
      try {
        const ordine = await prisma.ordineFornitore.findUnique({
          where: { id },
          include: {
            fornitore: { select: { nome: true } },
            commessa: { select: { nome: true } },
            righe: { select: { descrizione: true, quantita: true, prezzoUnitario: true } },
          }
        })
        return { ordine }
      } catch (e) { console.error('AI context ordine:', e) }
    }
  }

  // ── Manutenzione detail ──────────────────────────────────────────────────────
  if (pathname.includes('/manutenzioni/')) {
    const id = extractId(parts)
    if (id) {
      try {
        const manutenzione = await prisma.manutenzioneProgrammata.findUnique({
          where: { id },
          include: {
            cliente: { select: { nome: true, telefono: true } },
            proposte: { select: { stato: true, dataPropostaPrevista: true }, orderBy: { createdAt: 'desc' }, take: 3 },
          }
        })
        return { manutenzione }
      } catch (e) { console.error('AI context manutenzione:', e) }
    }
  }

  // ── Operaio detail ───────────────────────────────────────────────────────────
  if (pathname.includes('/operai/')) {
    const id = extractId(parts)
    if (id && (role === 'impresa' || role === 'ufficio')) {
      try {
        const operaio = await prisma.operaio.findUnique({
          where: { id },
          select: { nome: true, ruolo: true, costoOrario: true, zona: true, skills: true, note: true }
        })
        return { operaio }
      } catch (e) { console.error('AI context operaio:', e) }
    }
  }

  // ── Promemoria list ──────────────────────────────────────────────────────────
  if (pathname.includes('/promemoria')) {
    if (role === 'impresa' || role === 'ufficio') {
      try {
        const oggi = new Date()
        const inizioOggi = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate(), 0, 0, 0)
        const [prossimi, scaduti, urgenti] = await Promise.all([
          prisma.promemoria.findMany({
            where: { stato: 'attivo', dataOra: { gte: oggi } },
            include: { operaio: { select: { nome: true } }, cliente: { select: { nome: true } }, commessa: { select: { nome: true } } },
            orderBy: { dataOra: 'asc' },
            take: 8,
          }),
          prisma.promemoria.count({ where: { stato: 'attivo', dataOra: { lt: oggi } } }),
          prisma.promemoria.count({ where: { stato: 'attivo', priorita: { in: ['urgente', 'alta'] }, dataOra: { gte: inizioOggi } } }),
        ])
        return {
          sezione: 'promemoria',
          promemoria: prossimi.map(p => ({
            id: p.id, titolo: p.titolo, tipo: p.tipo, priorita: p.priorita,
            dataOra: p.dataOra, luogo: p.luogo, stato: p.stato,
            operaioNome: p.operaio?.nome, clienteNome: p.cliente?.nome, commessaNome: p.commessa?.nome,
          })),
          promemoriScaduti: scaduti,
          promemoriUrgentiOggi: urgenti,
          azioniConsentite: role === 'impresa'
            ? ['crea_promemoria', 'modifica_promemoria', 'assegna_operaio', 'collega_cliente', 'collega_commessa', 'elimina_promemoria', 'registra_esito', 'rimanda']
            : ['crea_promemoria', 'modifica_promemoria', 'assegna_operaio', 'collega_cliente', 'collega_commessa', 'registra_esito', 'rimanda'],
        }
      } catch (e) { console.error('AI context promemoria:', e) }
    }
  }

  // ── Richiesta materiale detail (magazziniere) ────────────────────────────────
  if (pathname.includes('/richieste/')) {
    const id = extractId(parts)
    if (id) {
      try {
        const richiesta = await prisma.richiestaMateriale.findUnique({
          where: { id },
          include: {
            operaio: { select: { nome: true } },
            commessa: { select: { nome: true } },
            materiale: { select: { descrizione: true } },
          }
        })
        return { richiesta }
      } catch (e) { console.error('AI context richiesta:', e) }
    }
  }

  // ── Dashboard (tutti i ruoli) ────────────────────────────────────────────────
  if (pathname.includes('/dashboard')) {
    try {
      if (role === 'impresa' || role === 'ufficio') {
        const [commesseAperte, preventiviDaInviare, ordiniAperti, fattureDaPagare, fattureDaIncassare, prosTodayCount] = await Promise.all([
          prisma.commessa.count({ where: { stato: 'aperta', archiviata: false } }),
          prisma.preventivo.count({ where: { stato: 'bozza' } }),
          prisma.ordineFornitore.count({ where: { stato: { in: ['richiesto', 'ordinato'] } } }),
          prisma.fatturaPassiva.count({ where: { stato: 'da_pagare' } }),
          prisma.fatturaAttiva.count({ where: { stato: { in: ['da_incassare', 'parzialmente_incassata', 'scaduta'] } } }),
          prisma.promemoria.count({ where: { stato: 'attivo', dataOra: { gte: new Date(new Date().setHours(0,0,0,0)), lte: new Date(new Date().setHours(23,59,59,999)) } } }),
        ])
        return { dashboard: { commesseAperte, preventiviDaInviare, ordiniAperti, fattureDaPagare, fattureDaIncassare, promemoriOggi: prosTodayCount } }
      }
      if (role === 'operaio' && email) {
        const operaio = await prisma.operaio.findFirst({ where: { email }, select: { id: true, nome: true } })
        if (operaio) {
          const [giornateRecenti, pianificazioniDomani] = await Promise.all([
            prisma.giornata.findMany({
              where: { operaioId: operaio.id },
              select: { data: true, stato: true, commessa: { select: { nome: true } } },
              orderBy: { data: 'desc' }, take: 5,
            }),
            prisma.pianificazione.findMany({
              where: { operaioId: operaio.id, data: { gte: new Date() } },
              select: { data: true, lavoroDaFare: true, commessa: { select: { nome: true } } },
              take: 3,
            }),
          ])
          return { dashboard: { nomeOperaio: operaio.nome, giornateRecenti, pianificazioniDomani } }
        }
      }
      if (role === 'magazziniere') {
        const richiesteUrgenti = await prisma.richiestaMateriale.count({ where: { stato: 'richiesta', urgente: true } })
        const richiesteTotali = await prisma.richiestaMateriale.count({ where: { stato: 'richiesta' } })
        return { dashboard: { richiesteUrgenti, richiesteTotali } }
      }
      if (role === 'cliente' && email) {
        const cliente = await prisma.cliente.findFirst({ where: { email }, select: { id: true, nome: true } })
        if (cliente) {
          const commesse = await prisma.commessa.findMany({
            where: { clienteId: cliente.id, archiviata: false },
            select: { nome: true, stato: true, avanzamentoPercentuale: true },
          })
          return { dashboard: { nomeCliente: cliente.nome, commesse } }
        }
      }
    } catch (e) { console.error('AI context dashboard:', e) }
  }

  // ── Rapportini list (impresa) ────────────────────────────────────────────────
  if (pathname.includes('/rapportini') && (role === 'impresa' || role === 'ufficio')) {
    try {
      const recenti = await prisma.rapportino.findMany({
        include: { giornata: { select: { data: true, commessa: { select: { nome: true } }, operaio: { select: { nome: true } } } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      })
      return { rapportiniRecenti: recenti.map(r => ({ data: r.giornata.data, commessa: r.giornata.commessa.nome, operaio: r.giornata.operaio.nome, lavoroEseguito: r.lavoroEseguito })) }
    } catch (e) { console.error('AI context rapportini:', e) }
  }

  return {}
}
