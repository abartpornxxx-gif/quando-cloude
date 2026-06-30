export type CategoriaConteggio = 'SUPPORTI' | 'FRUTTI' | 'ILLUMINAZIONE'

export type VocePredefinita = {
  codice: string
  descrizione: string
  categoria: CategoriaConteggio
  unita: string
}

export const VOCI_PREDEFINITE: VocePredefinita[] = [
  // ── SUPPORTI / SCATOLE ─────────────────────────────────────────────────────
  { codice: 'SUP_503',    descrizione: 'Supporto 503',             categoria: 'SUPPORTI', unita: 'pz' },
  { codice: 'SUP_504',    descrizione: 'Supporto 504',             categoria: 'SUPPORTI', unita: 'pz' },
  { codice: 'SUP_506',    descrizione: 'Supporto 506',             categoria: 'SUPPORTI', unita: 'pz' },
  { codice: 'SCA_503',    descrizione: 'Scatola 503',              categoria: 'SUPPORTI', unita: 'pz' },
  { codice: 'SCA_504',    descrizione: 'Scatola 504',              categoria: 'SUPPORTI', unita: 'pz' },
  { codice: 'SCA_506',    descrizione: 'Scatola 506',              categoria: 'SUPPORTI', unita: 'pz' },
  { codice: 'DERIV_PT4',  descrizione: 'Cassetta derivazione PT4', categoria: 'SUPPORTI', unita: 'pz' },
  { codice: 'DERIV_PT5',  descrizione: 'Cassetta derivazione PT5', categoria: 'SUPPORTI', unita: 'pz' },
  { codice: 'DERIV_PT6',  descrizione: 'Cassetta derivazione PT6', categoria: 'SUPPORTI', unita: 'pz' },
  { codice: 'DERIV_PT7',  descrizione: 'Cassetta derivazione PT7', categoria: 'SUPPORTI', unita: 'pz' },
  { codice: 'CASS_1010',  descrizione: 'Cassetta 10x10',           categoria: 'SUPPORTI', unita: 'pz' },
  { codice: 'CASS_913',   descrizione: 'Cassetta 9x13',            categoria: 'SUPPORTI', unita: 'pz' },

  // ── FRUTTI SERIE CIVILE ────────────────────────────────────────────────────
  { codice: 'FRU_INT',    descrizione: 'Interruttore',             categoria: 'FRUTTI', unita: 'pz' },
  { codice: 'FRU_DEV',    descrizione: 'Deviatore',                categoria: 'FRUTTI', unita: 'pz' },
  { codice: 'FRU_INV',    descrizione: 'Invertitore',              categoria: 'FRUTTI', unita: 'pz' },
  { codice: 'FRU_PUL',    descrizione: 'Pulsante',                 categoria: 'FRUTTI', unita: 'pz' },
  { codice: 'FRU_BIPA',   descrizione: 'Presa bipasso 10/16A',     categoria: 'FRUTTI', unita: 'pz' },
  { codice: 'FRU_SCHU',   descrizione: 'Presa Schuko',             categoria: 'FRUTTI', unita: 'pz' },
  { codice: 'FRU_UNIV',   descrizione: 'Presa universale',         categoria: 'FRUTTI', unita: 'pz' },
  { codice: 'FRU_TV',     descrizione: 'Presa TV',                 categoria: 'FRUTTI', unita: 'pz' },
  { codice: 'FRU_SAT',    descrizione: 'Presa SAT',                categoria: 'FRUTTI', unita: 'pz' },
  { codice: 'FRU_RJ45',   descrizione: 'Presa RJ45 / LAN',         categoria: 'FRUTTI', unita: 'pz' },
  { codice: 'FRU_TEL',    descrizione: 'Presa telefono',           categoria: 'FRUTTI', unita: 'pz' },
  { codice: 'FRU_TAPPO',  descrizione: 'Tappo',                    categoria: 'FRUTTI', unita: 'pz' },
  { codice: 'FRU_DIM',    descrizione: 'Dimmer',                   categoria: 'FRUTTI', unita: 'pz' },
  { codice: 'FRU_RELE',   descrizione: 'Relè',                     categoria: 'FRUTTI', unita: 'pz' },
  { codice: 'FRU_SUON',   descrizione: 'Suoneria / ronzatore',     categoria: 'FRUTTI', unita: 'pz' },
  { codice: 'FRU_TERM',   descrizione: 'Termostato',               categoria: 'FRUTTI', unita: 'pz' },
  { codice: 'FRU_TAPP',   descrizione: 'Comando tapparella',       categoria: 'FRUTTI', unita: 'pz' },
  { codice: 'FRU_USB',    descrizione: 'Presa USB',                categoria: 'FRUTTI', unita: 'pz' },
  { codice: 'FRU_ALTRO',  descrizione: 'Altro frutto',             categoria: 'FRUTTI', unita: 'pz' },

  // ── ILLUMINAZIONE ──────────────────────────────────────────────────────────
  { codice: 'ILL_PLAF',   descrizione: 'Plafoniera',               categoria: 'ILLUMINAZIONE', unita: 'pz' },
  { codice: 'ILL_LAMP',   descrizione: 'Lampadario',               categoria: 'ILLUMINAZIONE', unita: 'pz' },
  { codice: 'ILL_FAR',    descrizione: 'Faretto',                  categoria: 'ILLUMINAZIONE', unita: 'pz' },
  { codice: 'ILL_PUNT',   descrizione: 'Punto luce',               categoria: 'ILLUMINAZIONE', unita: 'pz' },
  { codice: 'ILL_SLED',   descrizione: 'Striscia LED',             categoria: 'ILLUMINAZIONE', unita: 'ml' },
  { codice: 'ILL_PLED',   descrizione: 'Profilo LED',              categoria: 'ILLUMINAZIONE', unita: 'ml' },
  { codice: 'ILL_ALIM',   descrizione: 'Alimentatore LED',         categoria: 'ILLUMINAZIONE', unita: 'pz' },
  { codice: 'ILL_SENS',   descrizione: 'Sensore movimento',        categoria: 'ILLUMINAZIONE', unita: 'pz' },
  { codice: 'ILL_APPL',   descrizione: 'Applique',                 categoria: 'ILLUMINAZIONE', unita: 'pz' },
  { codice: 'ILL_EMER',   descrizione: 'Luce emergenza',           categoria: 'ILLUMINAZIONE', unita: 'pz' },
  { codice: 'ILL_EST',    descrizione: 'Punto luce esterno',       categoria: 'ILLUMINAZIONE', unita: 'pz' },
  { codice: 'ILL_ALTRO',  descrizione: 'Altro illuminazione',      categoria: 'ILLUMINAZIONE', unita: 'pz' },
]

export const TIPI_LAVORAZIONE = [
  'Sottotraccia',
  'Esterno',
  'Misto',
  'Rifacimento',
  'Completamento',
  'Modifica impianto',
  'Quadro elettrico',
  'Illuminazione',
]

export const SERIE_CIVILI = [
  'BTicino Matix',
  'BTicino Living Light',
  'BTicino Living International',
  'BTicino Living Now',
  'Altra serie',
]

export const AMPERAGGI_QUADRO = ['6A', '10A', '16A', '20A', '25A', '32A', '40A', 'Altro']
export const TIPI_INTERRUTTORE = [
  { value: 'magnetotermico',      label: 'Magnetotermico' },
  { value: 'differenziale',       label: 'Differenziale puro' },
  { value: 'magnetotermico_diff', label: 'Magnetotermico differenziale' },
]
export const POLI_QUADRO = ['1P+N', '2P', '3P', '4P']
export const CURVE_QUADRO = ['C', 'B', 'D', '—']
export const TENSIONI_QUADRO = ['220V', '380V']

export type PresetQuadro = {
  descrizione: string
  tipo: string
  amperaggio: string
  curva: string
  poli: string
  tensione: string
}

export const PRESET_QUADRO: PresetQuadro[] = [
  { descrizione: 'Generale',        tipo: 'magnetotermico',      amperaggio: '32A', curva: 'C', poli: '2P',  tensione: '220V' },
  { descrizione: 'Prese',           tipo: 'magnetotermico_diff', amperaggio: '25A', curva: 'C', poli: '1P+N', tensione: '220V' },
  { descrizione: 'Luci',            tipo: 'magnetotermico_diff', amperaggio: '20A', curva: 'C', poli: '1P+N', tensione: '220V' },
  { descrizione: 'Cucina',          tipo: 'magnetotermico_diff', amperaggio: '25A', curva: 'C', poli: '1P+N', tensione: '220V' },
  { descrizione: 'Condizionatori',  tipo: 'magnetotermico_diff', amperaggio: '16A', curva: 'C', poli: '1P+N', tensione: '220V' },
  { descrizione: 'Bagni',           tipo: 'magnetotermico_diff', amperaggio: '16A', curva: 'C', poli: '1P+N', tensione: '220V' },
  { descrizione: 'Lavatrice',       tipo: 'magnetotermico_diff', amperaggio: '16A', curva: 'C', poli: '1P+N', tensione: '220V' },
  { descrizione: 'Boiler',          tipo: 'magnetotermico_diff', amperaggio: '16A', curva: 'C', poli: '1P+N', tensione: '220V' },
  { descrizione: 'Forno',           tipo: 'magnetotermico_diff', amperaggio: '16A', curva: 'C', poli: '1P+N', tensione: '220V' },
  { descrizione: 'Piano induzione', tipo: 'magnetotermico_diff', amperaggio: '32A', curva: 'C', poli: '1P+N', tensione: '220V' },
  { descrizione: 'Linea esterna',   tipo: 'magnetotermico',      amperaggio: '16A', curva: 'C', poli: '1P+N', tensione: '220V' },
  { descrizione: 'Altro circuito',  tipo: 'magnetotermico',      amperaggio: '16A', curva: 'C', poli: '1P+N', tensione: '220V' },
]

// Calcolo automatico placche: 1 placca per ogni supporto 503/504/506
export function calcolaPlacche(quantitaMap: Record<string, number>): number {
  return (quantitaMap['SUP_503'] ?? 0) + (quantitaMap['SUP_504'] ?? 0) + (quantitaMap['SUP_506'] ?? 0)
}

export const CODICI_SUPPORTI_PLACCHE = ['SUP_503', 'SUP_504', 'SUP_506']

export const LABEL_STATO: Record<string, string> = {
  richiesto:       'Richiesto',
  in_compilazione: 'In compilazione',
  inviato:         'Inviato',
  approvato:       'Approvato',
  riaperto:        'Riaperto',
}

export const COLOR_STATO: Record<string, string> = {
  richiesto:       'bg-slate-100 text-slate-600 border-slate-200',
  in_compilazione: 'bg-amber-50 text-amber-700 border-amber-200',
  inviato:         'bg-blue-50 text-blue-700 border-blue-200',
  approvato:       'bg-emerald-50 text-emerald-700 border-emerald-200',
  riaperto:        'bg-orange-50 text-orange-700 border-orange-200',
}
