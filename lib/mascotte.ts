export interface Mascotte {
  id: string
  nome: string
  file: string
  descrizione: string
  categoria: 'operaio' | 'impresa' | 'entrambi'
}

export const MASCOTTE: Mascotte[] = [
  { id: 'leone', nome: 'Leo il costruttore', file: '/mascotte/mascotte_leone.png', descrizione: 'Forte, coraggioso e leader indiscusso del cantiere.', categoria: 'entrambi' },
  { id: 'volpe', nome: 'Volpe la astuta', file: '/mascotte/mascotte_volpe.png', descrizione: 'Risolve i problemi più complessi con ingegno.', categoria: 'entrambi' },
  { id: 'bulldog', nome: 'Bulldog il tenace', file: '/mascotte/mascotte_bulldog.png', descrizione: 'Non molla mai finché il lavoro non è a regola d\'arte.', categoria: 'entrambi' },
  { id: 'gufo', nome: 'Gufo il saggio', file: '/mascotte/mascotte_gufo.png', descrizione: 'Pianifica ogni dettaglio con precisione millimetrica.', categoria: 'entrambi' },
  { id: 'orso', nome: 'Orso il solido', file: '/mascotte/mascotte_orso.png', descrizione: 'Una roccia per il team, gestisce i carichi più pesanti.', categoria: 'entrambi' },
  { id: 'lupo', nome: 'Lupo di squadra', file: '/mascotte/mascotte_lupo.png', descrizione: 'Lavora in sinergia e coordina il branco operativo.', categoria: 'entrambi' },
  { id: 'gatto', nome: 'Gatto agile', file: '/mascotte/mascotte_gatto.png', descrizione: 'Si muove con agilità e precisione nei piccoli spazi.', categoria: 'entrambi' },
  { id: 'scimmia', nome: 'Scimmia ingegnosa', file: '/mascotte/mascotte_scimmia.png', descrizione: 'Trova soluzioni creative per ogni tipo di impianto.', categoria: 'entrambi' },
  { id: 'coniglio', nome: 'Coniglio rapido', file: '/mascotte/mascotte_coniglio.png', descrizione: 'Veloce ed efficiente nei tempi di consegna.', categoria: 'entrambi' },
  { id: 'aquila', nome: 'Aquila vedetta', file: '/mascotte/mascotte_aquila.png', descrizione: 'Supervisiona dall\'alto e nota ogni minima imperfezione.', categoria: 'entrambi' },
  { id: 'tigre', nome: 'Tigre energica', file: '/mascotte/mascotte_tigre.png', descrizione: 'Grinta da vendere e determinazione in ogni fase.', categoria: 'entrambi' },
  { id: 'panda', nome: 'Panda sereno', file: '/mascotte/mascotte_panda.png', descrizione: 'Mantiene la calma anche nei momenti di massima urgenza.', categoria: 'entrambi' },
  { id: 'pinguino', nome: 'Pinguino coordinato', file: '/mascotte/mascotte_pinguino.png', descrizione: 'Ordinato, metodico ed estremamente pulito nel lavoro.', categoria: 'entrambi' },
  { id: 'cervo', nome: 'Cervo nobile', file: '/mascotte/mascotte_cervo.png', descrizione: 'Focalizzato sugli standard qualitativi e normativi.', categoria: 'entrambi' },
  { id: 'koala', nome: 'Koala tranquillo', file: '/mascotte/mascotte_koala.png', descrizione: 'Lavora con metodo, calma e zero stress.', categoria: 'entrambi' },
  { id: 'procione', nome: 'Procione curioso', file: '/mascotte/mascotte_procione.png', descrizione: 'Ispeziona ogni dettaglio con estrema curiosità.', categoria: 'entrambi' },
  { id: 'giraffa', nome: 'Giraffa lungimirante', file: '/mascotte/mascotte_giraffa.png', descrizione: 'Vede oltre e previene i problemi futuri in cantiere.', categoria: 'entrambi' },
  { id: 'elefantino', nome: 'Elefantino potente', file: '/mascotte/mascotte_elefantino.png', descrizione: 'Grande forza e memoria storica dei lavori eseguiti.', categoria: 'entrambi' },
  { id: 'rinoceronte', nome: 'Rinoceronte inarrestabile', file: '/mascotte/mascotte_rinoceronte.png', descrizione: 'Affronta le difficoltà di petto senza esitazione.', categoria: 'entrambi' },
  { id: 'castoro', nome: 'Castoro operoso', file: '/mascotte/mascotte_castoro.png', descrizione: 'Instancabile costruttore e maestro dei raccordi idraulici.', categoria: 'entrambi' },
  { id: 'riccio', nome: 'Riccio preciso', file: '/mascotte/mascotte_riccio.png', descrizione: 'Minuzioso nei dettagli e meticoloso nei cablaggi.', categoria: 'entrambi' },
  { id: 'tartaruga', nome: 'Tartaruga sicura', file: '/mascotte/mascotte_tartaruga.png', descrizione: 'Lenta ma inesorabile, garantisce la massima sicurezza.', categoria: 'entrambi' },
  { id: 'coccodrillo', nome: 'Coccodrillo robusto', file: '/mascotte/mascotte_coccodrillo.png', descrizione: 'Resistente a tutte le condizioni atmosferiche.', categoria: 'entrambi' },
  { id: 'cane', nome: 'Cane fedele', file: '/mascotte/mascotte_cane.png', descrizione: 'Sempre disponibile ad aiutare i colleghi in difficoltà.', categoria: 'entrambi' },
  { id: 'topolino', nome: 'Topolino agile', file: '/mascotte/mascotte_topolino.png', descrizione: 'Si infila nei passaggi cavi più angusti.', categoria: 'entrambi' },
  { id: 'capra', nome: 'Capra determinata', file: '/mascotte/mascotte_capra.png', descrizione: 'Supera gli ostacoli più impervi in quota.', categoria: 'entrambi' },
  { id: 'lama', nome: 'Lama socievole', file: '/mascotte/mascotte_lama.png', descrizione: 'Mantiene l\'allegria e il buon umore nel team.', categoria: 'entrambi' },
  { id: 'scoiattolo', nome: 'Scoiattolo rapido', file: '/mascotte/mascotte_scoiattolo.png', descrizione: 'Organizza e archivia i materiali con rapidità.', categoria: 'entrambi' },
  { id: 'toro', nome: 'Toro vigoroso', file: '/mascotte/mascotte_toro.png', descrizione: 'Potenza pura nelle tracce e nelle demolizioni.', categoria: 'entrambi' },
  { id: 'camaleonte', nome: 'Camaleonte adattabile', file: '/mascotte/mascotte_camaleonte.png', descrizione: 'Si adatta a ogni tipologia di cantiere e impianto.', categoria: 'entrambi' }
]

export function generaBioMascotte(nome: string, mascotteId: string, colore: string): string {
  const nomePulito = nome.split(' ')[0] || 'L\'operaio'
  const coloreTradotto = colore.toLowerCase()
  
  const templates: Record<string, string> = {
    leone: `${nomePulito} ruggisce in cantiere con un casco ${coloreTradotto}, ma si commuove davanti a un cornetto caldo prima di iniziare!`,
    volpe: `${nomePulito} risolve i problemi elettrici più complessi con un casco ${coloreTradotto} e l'astuzia di una volpe, anche se si perde a cercare il metro.`,
    bulldog: `${nomePulito} non molla mai il cantiere con il suo casco ${coloreTradotto}, tranne quando sente profumo di caffè appena fatto!`,
    gufo: `${nomePulito} scruta la planimetria dall'alto con il suo casco ${coloreTradotto}, pronto a correggere anche i millimetri sfuggiti al progettista.`,
    orso: `${nomePulito} solleva quintali di tubi con un casco ${coloreTradotto} e la solidità di un grizzly, ma ha un cuore d'oro.`,
    castoro: `${nomePulito} modella raccordi idraulici a tempo di record con un casco ${coloreTradotto}, praticamente una diga umana!`,
    riccio: `${nomePulito} sistema i cavi di rete con precisione millimetrica e un casco ${coloreTradotto}, attento a non pungersi con i cablaggi!`,
    tartaruga: `${nomePulito} posa i mattoni con calma olimpica e un casco ${coloreTradotto}, lento ma inesorabile fino alla fine della giornata.`,
  }

  if (templates[mascotteId]) {
    return templates[mascotteId]
  }

  const masc = MASCOTTE.find(m => m.id === mascotteId)
  const nomeAnimale = masc ? masc.nome.split(' ').slice(0, 2).join(' ') : 'simpatico compagno'
  return `${nomePulito} affronta ogni sfida con il casco ${coloreTradotto} e lo spirito di ${nomeAnimale}, sempre pronto a strappare una risata al team!`
}

