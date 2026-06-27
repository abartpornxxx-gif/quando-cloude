export interface Mascotte {
  id: string
  nome: string
  file: string
  descrizione: string
  categoria: 'operaio' | 'impresa' | 'entrambi'
}

export const MASCOTTE: Mascotte[] = [
  { id: 'leone', nome: 'Leone Dirigente', file: '/mascotte/avatar_lion.png', descrizione: 'Comando e precisione. Ideale per chi guida l\'azienda con autorevolezza.', categoria: 'entrambi' },
  { id: 'pappagallo', nome: 'Pappagallo Manager', file: '/mascotte/avatar_parrot.png', descrizione: 'Elegante, comunicativo e impeccabile nella gestione dei clienti.', categoria: 'entrambi' },
  { id: 'tartaruga', nome: 'Tartaruga Ninja', file: '/mascotte/avatar_turtle.png', descrizione: 'Risolve i problemi idraulici e di cantiere con mosse silenziose e letali.', categoria: 'entrambi' },
  { id: 'bulldog', nome: 'Bulldog Operativo', file: '/mascotte/avatar_bulldog.png', descrizione: 'Tenace, robusto e instancabile. Nessun lavoro è troppo pesante.', categoria: 'entrambi' },
  { id: 'gufo', nome: 'Gufo Ingegnere', file: '/mascotte/avatar_owl.png', descrizione: 'Pianificatore meticoloso, scruta ogni dettaglio del progetto.', categoria: 'entrambi' },
  { id: 'volpe', nome: 'Volpe Tecnico', file: '/mascotte/avatar_fox.png', descrizione: 'Intelligente e acuta, perfetta per il problem solving avanzato.', categoria: 'entrambi' },
  { id: 'orso', nome: 'Orso Capocantiere', file: '/mascotte/avatar_bear.png', descrizione: 'Forza bruta unita a grande affidabilità e presenza in cantiere.', categoria: 'entrambi' },
  { id: 'scimmia', nome: 'Scimmia Elettricista', file: '/mascotte/avatar_monkey.png', descrizione: 'Agile e brillante, in grado di sbrogliare i cablaggi più complessi.', categoria: 'entrambi' },
  { id: 'aquila', nome: 'Aquila Ispettore', file: '/mascotte/avatar_eagle.png', descrizione: 'Vista infallibile per i dettagli. Nessun difetto sfugge al suo controllo.', categoria: 'entrambi' },
  { id: 'tigre', nome: 'Tigre Supervisore', file: '/mascotte/avatar_tiger.png', descrizione: 'Dinamica ed energica, assicura ritmi elevati e standard altissimi.', categoria: 'entrambi' },
  { id: 'panda', nome: 'Panda Diligente', file: '/mascotte/avatar_panda.png', descrizione: 'Costante e sereno, lavora con grande professionalità in ogni condizione.', categoria: 'entrambi' },
  { id: 'pinguino', nome: 'Pinguino Frigorista', file: '/mascotte/avatar_penguin.png', descrizione: 'Specialista del freddo e dell\'HVAC, impeccabile e organizzato.', categoria: 'entrambi' },
  { id: 'rinoceronte', nome: 'Rinoceronte Demolizioni', file: '/mascotte/avatar_rhino.png', descrizione: 'Potenza allo stato puro, inarrestabile nelle fasi di tracciatura e demolizione.', categoria: 'entrambi' },
  { id: 'castoro', nome: 'Castoro Idraulico', file: '/mascotte/avatar_beaver.png', descrizione: 'Maestro delle tubazioni, l\'esperto definitivo degli impianti idrici.', categoria: 'entrambi' },
  { id: 'riccio', nome: 'Riccio Cablatore', file: '/mascotte/avatar_hedgehog.png', descrizione: 'Meticoloso nei lavori di precisione, cabla quadri elettrici perfetti.', categoria: 'entrambi' },
  { id: 'lupo', nome: 'Lupo Team Leader', file: '/mascotte/avatar_wolf.png', descrizione: 'Guida il branco, eccellente nel coordinamento delle squadre.', categoria: 'entrambi' },
  { id: 'camaleonte', nome: 'Camaleonte Pittore', file: '/mascotte/avatar_chameleon.png', descrizione: 'Versatile e preciso, si adatta perfettamente a qualsiasi ambiente.', categoria: 'entrambi' }
]

export function generaBioMascotte(nome: string, mascotteId: string, colore: string): string {
  const nomePulito = nome.split(' ')[0] || 'L\'utente'
  const coloreTradotto = colore.toLowerCase()
  
  const templates: Record<string, string> = {
    leone: `${nomePulito} guida il team con autorevolezza. Il suo stile ${coloreTradotto} riflette una leadership solida e professionale.`,
    pappagallo: `${nomePulito} gestisce ogni situazione con eleganza e comunicazione impeccabile, portando uno standard premium nei rapporti di lavoro.`,
    tartaruga: `${nomePulito} risolve i problemi più insidiosi in cantiere. Nessun guasto resiste al suo intervento strategico.`,
    bulldog: `${nomePulito} incarna la tenacia. Con i suoi colori ${coloreTradotto}, garantisce solidità e risultati eccellenti in ogni progetto.`,
    gufo: `Ogni progetto di ${nomePulito} è calcolato al millimetro. La precisione è il suo marchio di fabbrica.`,
    volpe: `${nomePulito} trova sempre la soluzione più smart. Acume tecnico e prontezza definiscono il suo lavoro.`,
    orso: `Affidabilità e presenza: ${nomePulito} gestisce le criticità con la massima serenità e forza.`,
    scimmia: `${nomePulito} sbroglia le complessità impiantistiche con un'ingegnosità senza pari, ottimizzando ogni risorsa.`,
    aquila: `Nessun dettaglio sfugge a ${nomePulito}. La sua supervisione garantisce il rispetto totale degli standard di qualità.`,
    tigre: `Energia e dinamismo. ${nomePulito} guida le operazioni assicurando rapidità d'esecuzione senza compromessi qualitativi.`,
    panda: `${nomePulito} lavora con una costanza impressionante, mantenendo alta la professionalità anche nelle situazioni sotto pressione.`,
    pinguino: `Sempre impeccabile. ${nomePulito} affronta l'impiantistica termoidraulica con metodo e precisione glaciale.`,
    rinoceronte: `Quando c'è da spingere, ${nomePulito} non si ferma mai. Efficienza operativa ai massimi livelli.`,
    castoro: `L'eccellenza nell'idraulica: ${nomePulito} progetta e realizza impianti a regola d'arte, fluidi e perfetti.`,
    riccio: `La cura dei dettagli è la firma di ${nomePulito}. Ogni collegamento è studiato per la massima sicurezza e durata.`,
    lupo: `Leader nato, ${nomePulito} coordina le squadre operative sul campo creando una sinergia invidiabile.`,
    camaleonte: `${nomePulito} vanta un'adattabilità eccezionale, capace di integrarsi in qualsiasi cantiere garantendo finiture eccellenti.`
  }

  if (templates[mascotteId]) {
    return templates[mascotteId]
  }

  const masc = MASCOTTE.find(m => m.id === mascotteId)
  const nomeAnimale = masc ? masc.nome : 'un professionista'
  return `${nomePulito} rappresenta i valori aziendali con estrema serietà. L'identità di ${nomeAnimale} testimonia dedizione e altissima competenza.`
}
