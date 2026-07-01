import { prisma } from '@/lib/prisma'

// ─── Tipi configurazione struttura ──────────────────────────────────────────

export type StrutturaConfig =
  | { tipo: 'commessa_semplice' }
  | { tipo: 'singolo_appartamento'; nome: string; piano?: string; conBox: boolean; conEsterno: boolean }
  | { tipo: 'condominio_parco'; scale: string[]; appartamentiPerScala: number; nBox: number; conEsterno: boolean; areeComuni: string[] }
  | { tipo: 'cantiere_strutturato'; zone: { tipo: string; nome: string }[] }
  | { tipo: 'capannone_industriale'; reparti: string[]; nQuadriElettrici: number; nLocaliTecnici: number; areaEsterna: boolean; nUffici: number; magazzino: boolean }
  | { tipo: 'solo_esterni'; zone: string[] }
  | { tipo: 'fotovoltaico_zone'; zone: string[] }
  | { tipo: 'manutenzione_zone'; zone: string[] }
  | { tipo: 'altro_personalizzato'; zone: { tipo: string; nome: string }[] }

// ─── Dispatcher principale ───────────────────────────────────────────────────

export async function creaStrutturaOrganizzazione(
  commessaId: string,
  config: StrutturaConfig
): Promise<void> {
  switch (config.tipo) {
    case 'commessa_semplice': return
    case 'singolo_appartamento': return creaSingoloAppartamento(commessaId, config)
    case 'condominio_parco':    return creaCondominio(commessaId, config)
    case 'cantiere_strutturato': return creaZonePersonalizzate(commessaId, config.zone)
    case 'capannone_industriale': return creaCapannone(commessaId, config)
    case 'solo_esterni':         return creaZoneFlat(commessaId, config.zone, 'ESTERNO')
    case 'fotovoltaico_zone':    return creaFotovoltaico(commessaId, config.zone)
    case 'manutenzione_zone':    return creaZoneFlat(commessaId, config.zone, 'ALTRO')
    case 'altro_personalizzato': return creaZonePersonalizzate(commessaId, config.zone)
  }
}

// ─── Singolo appartamento ────────────────────────────────────────────────────

async function creaSingoloAppartamento(
  commessaId: string,
  config: Extract<StrutturaConfig, { tipo: 'singolo_appartamento' }>
): Promise<void> {
  const nodi: { tipo: string; nome: string; piano?: string; ordinamento: number }[] = []
  nodi.push({ tipo: 'APPARTAMENTO', nome: config.nome || 'Appartamento', piano: config.piano || undefined, ordinamento: 0 })
  if (config.conBox)     nodi.push({ tipo: 'BOX',     nome: 'Box',     ordinamento: 1 })
  if (config.conEsterno) nodi.push({ tipo: 'ESTERNO', nome: 'Esterno', ordinamento: 2 })

  await prisma.$transaction(
    nodi.map(n => prisma.cantiereStrutturaNodo.create({
      data: { commessaId, tipo: n.tipo as never, nome: n.nome, piano: n.piano, ordinamento: n.ordinamento },
    }))
  )
}

// ─── Condominio / Parco ──────────────────────────────────────────────────────

export async function creaNodiStrutturaDaTemplate(
  commessaId: string,
  config: Extract<StrutturaConfig, { tipo: 'condominio_parco' }>
): Promise<void> {
  return creaCondominio(commessaId, config)
}

async function creaCondominio(
  commessaId: string,
  config: Extract<StrutturaConfig, { tipo: 'condominio_parco' }>
): Promise<void> {
  const figli: { commessaId: string; tipo: string; nome: string; ordinamento: number; parentId: string | null }[] = []

  for (let s = 0; s < config.scale.length; s++) {
    const scalaNome = config.scale[s].trim() || `Scala ${String.fromCharCode(65 + s)}`
    const scala = await prisma.cantiereStrutturaNodo.create({
      data: { commessaId, tipo: 'SCALA' as never, nome: scalaNome, ordinamento: s },
    })
    const pref = scalaNome.replace(/^Scala\s*/i, '')
    for (let a = 1; a <= Math.min(config.appartamentiPerScala, 20); a++) {
      figli.push({ commessaId, tipo: 'APPARTAMENTO', nome: `Appartamento ${pref}${a}`, parentId: scala.id, ordinamento: a - 1 })
    }
  }

  // Box multipli
  const nBox = Math.min(config.nBox ?? 0, 50)
  for (let b = 1; b <= nBox; b++) {
    figli.push({ commessaId, tipo: 'BOX', nome: nBox === 1 ? 'Box' : `Box ${b}`, parentId: null, ordinamento: b - 1 })
  }

  if (config.conEsterno) {
    figli.push({ commessaId, tipo: 'ESTERNO', nome: 'Esterno', parentId: null, ordinamento: 0 })
  }

  // Aree comuni con tipo appropriato
  const areaTipoMap: Record<string, string> = {
    'Androne':          'AREA_COMUNE',
    'Vano scala':       'AREA_COMUNE',
    'Vano contatori':   'LOCALE_TECNICO',
    'Locale tecnico':   'LOCALE_TECNICO',
    'Garage':           'GARAGE',
    'Cortile':          'CORTILE',
    'Copertura':        'COPERTURA',
  }
  for (let i = 0; i < (config.areeComuni ?? []).length; i++) {
    const area = config.areeComuni[i]
    figli.push({ commessaId, tipo: areaTipoMap[area] ?? 'AREA_COMUNE', nome: area, parentId: null, ordinamento: i })
  }

  if (figli.length > 0) {
    await prisma.$transaction(
      figli.map(n => prisma.cantiereStrutturaNodo.create({
        data: { commessaId: n.commessaId, tipo: n.tipo as never, nome: n.nome, parentId: n.parentId, ordinamento: n.ordinamento },
      }))
    )
  }
}

// ─── Capannone / Area industriale ────────────────────────────────────────────

async function creaCapannone(
  commessaId: string,
  config: Extract<StrutturaConfig, { tipo: 'capannone_industriale' }>
): Promise<void> {
  const nodi: { tipo: string; nome: string; ordinamento: number }[] = []
  let ord = 0

  for (const r of config.reparti) {
    nodi.push({ tipo: 'ALTRO', nome: r || 'Reparto', ordinamento: ord++ })
  }
  for (let q = 1; q <= Math.min(config.nQuadriElettrici, 20); q++) {
    nodi.push({ tipo: 'QUADRO_ELETTRICO', nome: config.nQuadriElettrici === 1 ? 'Quadro elettrico' : `Quadro elettrico ${q}`, ordinamento: ord++ })
  }
  for (let l = 1; l <= Math.min(config.nLocaliTecnici, 10); l++) {
    nodi.push({ tipo: 'LOCALE_TECNICO', nome: config.nLocaliTecnici === 1 ? 'Locale tecnico' : `Locale tecnico ${l}`, ordinamento: ord++ })
  }
  if (config.areaEsterna)  nodi.push({ tipo: 'ESTERNO', nome: 'Area esterna', ordinamento: ord++ })
  for (let u = 1; u <= Math.min(config.nUffici, 20); u++) {
    nodi.push({ tipo: 'ALTRO', nome: config.nUffici === 1 ? 'Uffici' : `Ufficio ${u}`, ordinamento: ord++ })
  }
  if (config.magazzino) nodi.push({ tipo: 'ALTRO', nome: 'Magazzino', ordinamento: ord++ })

  if (nodi.length > 0) {
    await prisma.$transaction(
      nodi.map(n => prisma.cantiereStrutturaNodo.create({
        data: { commessaId, tipo: n.tipo as never, nome: n.nome, ordinamento: n.ordinamento },
      }))
    )
  }
}

// ─── Fotovoltaico con zone ───────────────────────────────────────────────────

async function creaFotovoltaico(commessaId: string, zone: string[]): Promise<void> {
  const tipoMap: Record<string, string> = {
    'Copertura tetto': 'COPERTURA',
    'Inverter':        'LOCALE_TECNICO',
    'Batterie':        'LOCALE_TECNICO',
    'Quadro AC/DC':    'QUADRO_ELETTRICO',
    'Locale tecnico':  'LOCALE_TECNICO',
    'Linea contatore': 'ALTRO',
    'Area moduli':     'ESTERNO',
  }
  if (zone.length > 0) {
    await prisma.$transaction(
      zone.map((z, i) => prisma.cantiereStrutturaNodo.create({
        data: { commessaId, tipo: (tipoMap[z] ?? 'ALTRO') as never, nome: z, ordinamento: i },
      }))
    )
  }
}

// ─── Zone flat (solo_esterni, manutenzione, ecc.) ───────────────────────────

async function creaZoneFlat(commessaId: string, zone: string[], tipoDefault: string): Promise<void> {
  const tipoMapEsterno: Record<string, string> = {
    'Cortile': 'CORTILE',
    'Vano contatori': 'LOCALE_TECNICO',
    'Cancello': 'ALTRO',
    'Illuminazione esterna': 'ESTERNO',
    'Citofonia': 'ALTRO',
    'Area parcheggio': 'ESTERNO',
  }
  if (zone.length > 0) {
    await prisma.$transaction(
      zone.map((z, i) => prisma.cantiereStrutturaNodo.create({
        data: { commessaId, tipo: (tipoMapEsterno[z] ?? tipoDefault) as never, nome: z, ordinamento: i },
      }))
    )
  }
}

// ─── Zone personalizzate (cantiere strutturato, altro personalizzato) ────────

async function creaZonePersonalizzate(
  commessaId: string,
  zone: { tipo: string; nome: string }[]
): Promise<void> {
  if (zone.length > 0) {
    await prisma.$transaction(
      zone.map((z, i) => prisma.cantiereStrutturaNodo.create({
        data: { commessaId, tipo: z.tipo as never, nome: z.nome || 'Zona', ordinamento: i },
      }))
    )
  }
}
