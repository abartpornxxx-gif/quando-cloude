export interface UserContext {
  role: 'impresa' | 'ufficio' | 'operaio' | 'magazziniere' | 'cliente' | 'libero'
  pathname: string
  commessa?: any
  giornata?: any
  preventivo?: any
  richiestaPreventivo?: any
  variante?: any
}

export function sanitizeContext(context: UserContext): any {
  const { role } = context

  if (role === 'cliente') {
    const sanitizedCommessa = context.commessa ? {
      id: context.commessa.id,
      nome: context.commessa.nome,
      codice: context.commessa.codice,
      stato: context.commessa.stato,
      indirizzoCantiere: context.commessa.indirizzoCantiere,
      dataInizio: context.commessa.dataInizio,
      dataFinePrevista: context.commessa.dataFinePrevista,
      avanzamento: context.commessa.preventivato > 0 
        ? Math.min(100, Math.round((context.commessa.costiManodopera + context.commessa.costiMateriali + context.commessa.costiMezzi) / context.commessa.preventivato * 100))
        : 0,
      varianti: (context.commessa.varianti || [])
        .filter((v: any) => v.visibileCliente === true)
        .map((v: any) => ({
          id: v.id,
          titolo: v.titolo,
          descrizione: v.descrizione,
          importo: v.importo,
          stato: v.stato,
          createdAt: v.createdAt
        }))
    } : undefined

    return {
      role,
      pathname: context.pathname,
      commessa: sanitizedCommessa
    }
  }

  if (role === 'operaio') {
    const sanitizedGiornata = context.giornata ? {
      id: context.giornata.id,
      data: context.giornata.data,
      fase: context.giornata.fase,
      stato: context.giornata.stato,
      commessaNome: context.giornata.commessa?.nome,
      lavoroEseguito: context.giornata.rapportino?.lavoroEseguito,
      lavoriExtra: context.giornata.rapportino?.lavoriExtra,
      notePianificazione: context.giornata.notePianificazione
    } : undefined

    return {
      role,
      pathname: context.pathname,
      giornata: sanitizedGiornata
    }
  }

  if (role === 'magazziniere') {
    const sanitizedRichiesta = context.richiestaPreventivo ? {
      id: context.richiestaPreventivo.id,
      descrizione: context.richiestaPreventivo.descrizione,
      stato: context.richiestaPreventivo.stato,
      fornitoreNome: context.richiestaPreventivo.fornitore?.nome,
      dataRichiesta: context.richiestaPreventivo.dataRichiesta
    } : undefined

    return {
      role,
      pathname: context.pathname,
      richiestaPreventivo: sanitizedRichiesta
    }
  }

  if (role === 'ufficio') {
    return {
      role,
      pathname: context.pathname,
      commessa: context.commessa ? {
        id: context.commessa.id,
        nome: context.commessa.nome,
        codice: context.commessa.codice,
        stato: context.commessa.stato,
        preventivato: context.commessa.preventivato,
        fatturato: context.commessa.fatturato,
        scadenza: context.commessa.scadenza,
        clienteNome: context.commessa.cliente?.nome,
        varianti: (context.commessa.varianti || []).map((v: any) => ({
          id: v.id,
          titolo: v.titolo,
          descrizione: v.descrizione,
          importo: v.importo,
          stato: v.stato,
          visibileCliente: v.visibileCliente
        })),
        preventiviFornitori: (context.commessa.richiestePreventiviFornitori || []).map((rp: any) => ({
          id: rp.id,
          fornitoreNome: rp.fornitore?.nome,
          descrizione: rp.descrizione,
          stato: rp.stato,
          importo: rp.importo,
          dataScadenza: rp.dataScadenza
        }))
      } : undefined
    }
  }

  if (role === 'libero') {
    return {
      role,
      pathname: context.pathname
    }
  }

  // Impresa
  return {
    role,
    pathname: context.pathname,
    commessa: context.commessa ? {
      id: context.commessa.id,
      nome: context.commessa.nome,
      codice: context.commessa.codice,
      stato: context.commessa.stato,
      preventivato: context.commessa.preventivato,
      costiManodopera: context.commessa.costiManodopera,
      costiMateriali: context.commessa.costiMateriali,
      costiMezzi: context.commessa.costiMezzi,
      fatturato: context.commessa.fatturato,
      clienteNome: context.commessa.cliente?.nome,
      varianti: (context.commessa.varianti || []),
      preventiviFornitori: (context.commessa.richiestePreventiviFornitori || [])
    } : undefined
  }
}
