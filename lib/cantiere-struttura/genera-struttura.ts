import { prisma } from '@/lib/prisma'

export type StrutturaCondominioConfig = {
  scale: string[]
  appartamentiPerScala: number
  conBox: boolean
  conEsterno: boolean
  conAreaComune: boolean
}

export async function creaNodiStrutturaDaTemplate(
  commessaId: string,
  config: StrutturaCondominioConfig
): Promise<void> {
  const figliDaCreare: {
    commessaId: string
    tipo: string
    nome: string
    ordinamento: number
    parentId: string | null
  }[] = []

  for (let s = 0; s < config.scale.length; s++) {
    const scalaNome = config.scale[s].trim() || `Scala ${String.fromCharCode(65 + s)}`
    const scala = await prisma.cantiereStrutturaNodo.create({
      data: {
        commessaId,
        tipo: 'SCALA' as never,
        nome: scalaNome,
        ordinamento: s,
      },
    })

    const prefisso = scalaNome.replace(/^Scala\s*/i, '')
    for (let a = 1; a <= Math.min(config.appartamentiPerScala, 20); a++) {
      figliDaCreare.push({
        commessaId,
        tipo: 'APPARTAMENTO',
        nome: `Appartamento ${prefisso}${a}`,
        parentId: scala.id,
        ordinamento: a - 1,
      })
    }
  }

  const extra: { tipo: string; nome: string }[] = []
  if (config.conBox)        extra.push({ tipo: 'BOX',         nome: 'Box' })
  if (config.conEsterno)    extra.push({ tipo: 'ESTERNO',     nome: 'Esterno' })
  if (config.conAreaComune) extra.push({ tipo: 'AREA_COMUNE', nome: 'Area comune' })

  for (let i = 0; i < extra.length; i++) {
    figliDaCreare.push({ commessaId, tipo: extra[i].tipo, nome: extra[i].nome, ordinamento: i, parentId: null })
  }

  if (figliDaCreare.length > 0) {
    await prisma.$transaction(
      figliDaCreare.map(n =>
        prisma.cantiereStrutturaNodo.create({
          data: {
            commessaId: n.commessaId,
            tipo: n.tipo as never,
            nome: n.nome,
            parentId: n.parentId,
            ordinamento: n.ordinamento,
          },
        })
      )
    )
  }
}
