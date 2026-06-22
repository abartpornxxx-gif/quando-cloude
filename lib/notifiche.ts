/**
 * Centro notifiche QUADRO — tutti i conteggi sono CALCOLATI dallo stato DB.
 * Non c'è una tabella "notifiche" separata: si legge lo stato esistente.
 * La tabella `notifiche_lette` traccia solo il flag letta/non-letta per utente.
 */

import { prisma } from './prisma'

const TRA_30_GIORNI = () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
const TRA_14_GIORNI = () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
const IERI = () => new Date(Date.now() - 24 * 60 * 60 * 1000)
const SETTIMANA_FA = () => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

// ─── Helper lettura ───────────────────────────────────────────────────────────

async function getNotificheLette(userId: string): Promise<Set<string>> {
  const rows = await prisma.notificaLetta.findMany({
    where: { userId },
    select: { tipo: true, refId: true },
  })
  return new Set(rows.map(r => `${r.tipo}:${r.refId}`))
}

// ─── IMPRESA ─────────────────────────────────────────────────────────────────

export type AlertImpresa = {
  rapportiniMancanti: number
  scadenzeFatture: number
  richiesteOfferte: number
  richiesteMateriale: number
  scadenzeMezzi: number
  manutenzioniScadenti: number
  proposteAccettate: number
  totale: number
}

export async function alertImpresa(): Promise<AlertImpresa> {
  const tra30 = TRA_30_GIORNI()

  const [rapportiniMancanti, scadenzeFatture, richiesteOfferte, richiesteMateriale, scadenzeMezzi, manutenzioniScadenti, proposteAccettate] =
    await Promise.all([
      prisma.giornata.count({ where: { fase: 'fine', stato: 'bozza', rapportino: null } }),

      prisma.fatturaAttiva.count({
        where: { stato: { in: ['da_incassare', 'scaduta'] }, dataScadenza: { lte: tra30, not: null } },
      }),

      prisma.richiestaOfferta.count({ where: { stato: 'nuova' } }),

      prisma.richiestaMateriale.count({ where: { stato: 'richiesta' } }),

      prisma.mezzo.count({
        where: {
          OR: [
            { scadenzaBollo: { lte: tra30, not: null } },
            { scadenzaRevisione: { lte: tra30, not: null } },
            { scadenzaAssicurazione: { lte: tra30, not: null } },
          ],
        },
      }),

      // Scadenze senza proposta attiva: evita notifiche duplicate mentre il ciclo è in corso
      prisma.manutenzioneProgrammata.count({
        where: {
          attiva: true,
          dataProssimoIntervento: { lte: tra30 },
          proposte: {
            none: {
              stato: { in: ['Inviata', 'VistaDalCliente', 'Accettata', 'ConfermataManuale', 'CommessaCreata'] },
            },
          },
        },
      }),

      // Proposte di intervento accettate/confermate in attesa di commessa
      prisma.propostaIntervento.count({
        where: { stato: { in: ['Accettata', 'ConfermataManuale'] }, commessaId: null },
      }),
    ])

  return {
    rapportiniMancanti,
    scadenzeFatture,
    richiesteOfferte,
    richiesteMateriale,
    scadenzeMezzi,
    manutenzioniScadenti,
    proposteAccettate,
    totale: rapportiniMancanti + scadenzeFatture + richiesteOfferte + richiesteMateriale + scadenzeMezzi + manutenzioniScadenti + proposteAccettate,
  }
}

export type ItemNotifica = {
  id: string
  tipo: string
  titolo: string
  sottotitolo?: string
  href: string
  urgente?: boolean
  data?: Date | string | null
  letta?: boolean
}

export async function listaNotificheImpresa(userId?: string): Promise<ItemNotifica[]> {
  const tra30 = TRA_30_GIORNI()
  const items: ItemNotifica[] = []

  const [rapportini, fatture, offerte, richiesteMat, mezzi, manutenzioni, proposteAccettate, lette] = await Promise.all([
    prisma.giornata.findMany({
      where: { fase: 'fine', stato: 'bozza', rapportino: null },
      include: {
        operaio: { select: { nome: true } },
        commessa: { select: { nome: true } },
      },
      orderBy: { data: 'desc' },
      take: 20,
    }),
    prisma.fatturaAttiva.findMany({
      where: { stato: { in: ['da_incassare', 'scaduta'] }, dataScadenza: { lte: tra30, not: null } },
      include: { cliente: { select: { nome: true } } },
      orderBy: { dataScadenza: 'asc' },
      take: 10,
    }),
    prisma.richiestaOfferta.findMany({
      where: { stato: 'nuova' },
      include: { offerta: { select: { titolo: true } }, cliente: { select: { nome: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.richiestaMateriale.findMany({
      where: { stato: 'richiesta' },
      include: {
        operaio: { select: { nome: true } },
        commessa: { select: { nome: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.mezzo.findMany({
      where: {
        OR: [
          { scadenzaBollo: { lte: tra30, not: null } },
          { scadenzaRevisione: { lte: tra30, not: null } },
          { scadenzaAssicurazione: { lte: tra30, not: null } },
        ],
      },
      orderBy: { scadenzaBollo: 'asc' },
      take: 10,
    }),
    // Scadenze senza proposta attiva: evita notifiche duplicate mentre il ciclo è in corso
    prisma.manutenzioneProgrammata.findMany({
      where: {
        attiva: true,
        dataProssimoIntervento: { lte: tra30 },
        proposte: {
          none: {
            stato: { in: ['Inviata', 'VistaDalCliente', 'Accettata', 'ConfermataManuale', 'CommessaCreata'] },
          },
        },
      },
      include: { cliente: { select: { nome: true } } },
      orderBy: { dataProssimoIntervento: 'asc' },
      take: 10,
    }),
    // Proposte accettate/confermate senza commessa → impresa deve creare la commessa
    prisma.propostaIntervento.findMany({
      where: { stato: { in: ['Accettata', 'ConfermataManuale'] }, commessaId: null },
      include: {
        manutenzione: { select: { id: true, titolo: true } },
        cliente: { select: { nome: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    }),
    userId ? getNotificheLette(userId) : Promise.resolve(new Set<string>()),
  ])

  for (const g of rapportini) {
    items.push({
      id: g.id,
      tipo: 'rapportino',
      titolo: `Rapportino mancante — ${g.operaio.nome}`,
      sottotitolo: g.commessa.nome,
      href: `/impresa/giornate/${g.id}/chat`,
      urgente: true,
      data: g.data,
      letta: lette.has(`rapportino:${g.id}`),
    })
  }

  for (const f of fatture) {
    const scaduta = f.stato === 'scaduta' || (f.dataScadenza && new Date(f.dataScadenza) < new Date())
    items.push({
      id: f.id,
      tipo: 'fattura',
      titolo: `Fattura n. ${f.numero}/${f.anno} ${scaduta ? '— SCADUTA' : 'in scadenza'}`,
      sottotitolo: f.cliente?.nome ?? '',
      href: `/impresa/fatture/${f.id}`,
      urgente: !!scaduta,
      data: f.dataScadenza,
      letta: lette.has(`fattura:${f.id}`),
    })
  }

  for (const r of offerte) {
    items.push({
      id: r.id,
      tipo: 'offerta',
      titolo: `Richiesta interesse: ${r.offerta.titolo}`,
      sottotitolo: r.cliente.nome,
      href: `/impresa/richieste-offerte/${r.id}`,
      data: r.createdAt,
      letta: lette.has(`offerta:${r.id}`),
    })
  }

  for (const rm of richiesteMat) {
    items.push({
      id: rm.id,
      tipo: 'materiale',
      titolo: `Richiesta materiale: ${rm.descrizione}`,
      sottotitolo: `${rm.operaio.nome} · ${rm.commessa.nome}`,
      href: `/impresa/commesse`,
      urgente: rm.urgente,
      data: rm.createdAt,
      letta: lette.has(`materiale:${rm.id}`),
    })
  }

  for (const m of mezzi) {
    const prossima = [m.scadenzaBollo, m.scadenzaRevisione, m.scadenzaAssicurazione]
      .filter(Boolean)
      .sort((a, b) => new Date(a!).getTime() - new Date(b!).getTime())[0]
    items.push({
      id: m.id,
      tipo: 'mezzo',
      titolo: `Scadenza mezzo: ${m.nome}`,
      sottotitolo: m.targa ?? '',
      href: `/impresa/mezzi`,
      urgente: prossima ? new Date(prossima) < new Date() : false,
      data: prossima,
      letta: lette.has(`mezzo:${m.id}`),
    })
  }

  for (const man of manutenzioni) {
    const scaduta = man.dataProssimoIntervento < new Date()
    items.push({
      id: man.id,
      tipo: 'manutenzione',
      titolo: `Manutenzione ${scaduta ? 'SCADUTA' : 'in scadenza'}: ${man.titolo}`,
      sottotitolo: man.cliente.nome,
      href: `/impresa/manutenzioni/${man.id}`,
      urgente: scaduta,
      data: man.dataProssimoIntervento,
      letta: lette.has(`manutenzione:${man.id}`),
    })
  }

  for (const p of proposteAccettate) {
    items.push({
      id: p.id,
      tipo: 'proposta_accettata',
      titolo: `Proposta accettata: crea la commessa`,
      sottotitolo: `${p.manutenzione.titolo} — ${p.cliente.nome}`,
      href: `/impresa/manutenzioni/${p.manutenzioneId}`,
      urgente: false,
      data: p.updatedAt,
      letta: lette.has(`proposta_accettata:${p.id}`),
    })
  }

  return items
}

// ─── OPERAIO ─────────────────────────────────────────────────────────────────

export async function alertOperaio(operaioId: string): Promise<number> {
  const domani = new Date()
  domani.setDate(domani.getDate() + 1)
  domani.setHours(0, 0, 0, 0)
  const dopodomani = new Date(domani)
  dopodomani.setDate(dopodomani.getDate() + 1)

  const [rapportini, pianificazioni] = await Promise.all([
    prisma.giornata.count({
      where: { operaioId, fase: 'fine', stato: 'bozza', rapportino: null },
    }),
    prisma.pianificazione.count({
      where: { operaioId, sostituito: false, data: { gte: domani, lt: dopodomani } },
    }),
  ])

  return rapportini + pianificazioni
}

export async function listaNotificheOperaio(operaioId: string, userId?: string): Promise<ItemNotifica[]> {
  const domani = new Date()
  domani.setDate(domani.getDate() + 1)
  domani.setHours(0, 0, 0, 0)
  const dopodomani = new Date(domani)
  dopodomani.setDate(dopodomani.getDate() + 1)

  const items: ItemNotifica[] = []

  const [rapportini, pianificazioni, chatRecente, lette] = await Promise.all([
    prisma.giornata.findMany({
      where: { operaioId, fase: 'fine', stato: 'bozza', rapportino: null },
      include: { commessa: { select: { nome: true } } },
      orderBy: { data: 'desc' },
      take: 5,
    }),
    prisma.pianificazione.findMany({
      where: { operaioId, sostituito: false, data: { gte: domani, lt: dopodomani } },
      include: { commessa: { select: { nome: true } } },
    }),
    prisma.chatMessaggio.findMany({
      where: {
        ruolo: { not: 'operaio' },
        createdAt: { gte: IERI() },
        giornata: { operaioId },
      },
      include: { giornata: { select: { id: true, commessa: { select: { nome: true } } } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      distinct: ['giornataId'],
    }),
    userId ? getNotificheLette(userId) : Promise.resolve(new Set<string>()),
  ])

  for (const g of rapportini) {
    items.push({
      id: g.id,
      tipo: 'rapportino',
      titolo: 'Rapportino da compilare',
      sottotitolo: g.commessa.nome,
      href: `/operaio/giornata/${g.id}/rapportino`,
      urgente: true,
      data: g.data,
      letta: lette.has(`rapportino:${g.id}`),
    })
  }

  for (const p of pianificazioni) {
    items.push({
      id: p.id,
      tipo: 'pianificazione',
      titolo: 'Assegnazione per domani',
      sottotitolo: p.commessa.nome,
      href: '/operaio/domani',
      data: p.data,
      letta: lette.has(`pianificazione:${p.id}`),
    })
  }

  for (const m of chatRecente) {
    items.push({
      id: m.id,
      tipo: 'chat',
      titolo: 'Nuovo messaggio in chat',
      sottotitolo: m.giornata.commessa.nome,
      href: `/operaio/giornata/${m.giornataId}/chat`,
      data: m.createdAt,
      letta: lette.has(`chat:${m.id}`),
    })
  }

  return items
}

// ─── MAGAZZINIERE ─────────────────────────────────────────────────────────────

export async function alertMagazziniere(): Promise<number> {
  return prisma.richiestaMateriale.count({ where: { stato: 'richiesta' } })
}

export async function listaNotificheMagazziniere(userId?: string): Promise<ItemNotifica[]> {
  const [richieste, lette] = await Promise.all([
    prisma.richiestaMateriale.findMany({
      where: { stato: 'richiesta' },
      include: {
        operaio: { select: { nome: true } },
        commessa: { select: { nome: true } },
      },
      orderBy: [{ urgente: 'desc' }, { createdAt: 'asc' }],
      take: 20,
    }),
    userId ? getNotificheLette(userId) : Promise.resolve(new Set<string>()),
  ])

  return richieste.map(r => ({
    id: r.id,
    tipo: 'materiale',
    titolo: r.descrizione,
    sottotitolo: `${r.operaio.nome} · ${r.commessa.nome}`,
    href: `/magazziniere/richieste/${r.id}`,
    urgente: r.urgente,
    data: r.createdAt,
    letta: lette.has(`materiale:${r.id}`),
  }))
}

// ─── CLIENTE ─────────────────────────────────────────────────────────────────

export async function alertCliente(clienteId: string): Promise<number> {
  const tra14 = TRA_14_GIORNI()
  const settimanafa = SETTIMANA_FA()

  const [fatture, commesseChiuse, proposteAttive] = await Promise.all([
    prisma.fatturaAttiva.count({
      where: {
        clienteId,
        stato: { in: ['da_incassare', 'scaduta'] },
        dataScadenza: { lte: tra14, not: null },
      },
    }),
    prisma.commessa.count({
      where: { clienteId, stato: 'chiusa', updatedAt: { gte: settimanafa } },
    }),
    // Proposte di intervento in attesa di risposta dal cliente
    prisma.propostaIntervento.count({
      where: { clienteId, stato: { in: ['Inviata', 'VistaDalCliente'] } },
    }),
  ])

  return fatture + commesseChiuse + proposteAttive
}

export async function listaNotificheCliente(clienteId: string, userId?: string): Promise<ItemNotifica[]> {
  const tra14 = TRA_14_GIORNI()
  const settimanafa = SETTIMANA_FA()
  const items: ItemNotifica[] = []

  const [fatture, commesseChiuse, dicoRecenti, pianificazioni, proposteAttive, lette] = await Promise.all([
    prisma.fatturaAttiva.findMany({
      where: {
        clienteId,
        stato: { in: ['da_incassare', 'scaduta'] },
        dataScadenza: { lte: tra14, not: null },
      },
      orderBy: { dataScadenza: 'asc' },
      take: 5,
    }),
    prisma.commessa.findMany({
      where: { clienteId, stato: 'chiusa', updatedAt: { gte: settimanafa } },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    }),
    prisma.dichiarazioneConformita.findMany({
      where: {
        commessa: { clienteId },
        createdAt: { gte: settimanafa },
      },
      include: { commessa: { select: { nome: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.pianificazione.findMany({
      where: {
        commessa: { clienteId },
        data: { gte: new Date() },
        sostituito: false,
      },
      include: { commessa: { select: { nome: true } }, operaio: { select: { nome: true } } },
      orderBy: { data: 'asc' },
      take: 5,
    }),
    // Proposte di intervento in attesa di risposta
    prisma.propostaIntervento.findMany({
      where: { clienteId, stato: { in: ['Inviata', 'VistaDalCliente'] } },
      include: { manutenzione: { select: { titolo: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    userId ? getNotificheLette(userId) : Promise.resolve(new Set<string>()),
  ])

  for (const f of fatture) {
    const scaduta = f.stato === 'scaduta' || (f.dataScadenza && new Date(f.dataScadenza) < new Date())
    items.push({
      id: f.id,
      tipo: 'fattura',
      titolo: `Fattura n. ${f.numero}/${f.anno} ${scaduta ? '— scaduta' : 'in scadenza'}`,
      sottotitolo: 'Sezione Pagamenti',
      href: `/cliente/documenti/fattura/${f.id}`,
      urgente: !!scaduta,
      data: f.dataScadenza,
      letta: lette.has(`fattura:${f.id}`),
    })
  }

  for (const c of commesseChiuse) {
    items.push({
      id: c.id,
      tipo: 'lavoro',
      titolo: `Lavoro completato: ${c.nome}`,
      sottotitolo: 'Il cantiere è stato chiuso',
      href: `/cliente/lavori/${c.id}`,
      data: c.updatedAt,
      letta: lette.has(`lavoro:${c.id}`),
    })
  }

  for (const d of dicoRecenti) {
    items.push({
      id: d.id,
      tipo: 'documento',
      titolo: 'Nuovo documento disponibile',
      sottotitolo: `Dichiarazione di Conformità — ${d.commessa?.nome ?? ''}`,
      href: `/cliente/documenti/dico/${d.id}`,
      data: d.createdAt,
      letta: lette.has(`documento:${d.id}`),
    })
  }

  for (const p of pianificazioni) {
    items.push({
      id: p.id,
      tipo: 'appuntamento',
      titolo: `Appuntamento: ${p.commessa.nome}`,
      sottotitolo: `${p.operaio.nome} · ${new Date(p.data).toLocaleDateString('it-IT')}`,
      href: `/cliente/lavori/${p.commessaId}`,
      data: p.data,
      letta: lette.has(`appuntamento:${p.id}`),
    })
  }

  for (const prop of proposteAttive) {
    items.push({
      id: prop.id,
      tipo: 'proposta',
      titolo: 'Nuova proposta di intervento da confermare',
      sottotitolo: prop.manutenzione.titolo,
      href: '/cliente/manutenzioni',
      urgente: false,
      data: prop.dataPropostaPrevista,
      letta: lette.has(`proposta:${prop.id}`),
    })
  }

  return items
}
