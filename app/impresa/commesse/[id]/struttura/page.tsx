import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { requireImpresaOUfficio } from '@/lib/auth'
import { PageHeader } from '@/components/ui/PageHeader'
import { StrutturaTree } from './StrutturaTree'

type NodoFlat = {
  id: string
  tipo: string
  nome: string
  codice: string | null
  piano: string | null
  interno: string | null
  attivo: boolean
  ordinamento: number
  parentId: string | null
}

type NodoTree = NodoFlat & { children: NodoTree[] }

function buildTree(nodi: NodoFlat[]): NodoTree[] {
  const map = new Map<string, NodoTree>()
  for (const n of nodi) map.set(n.id, { ...n, children: [] })
  const roots: NodoTree[] = []
  for (const n of nodi) {
    if (n.parentId && map.has(n.parentId)) {
      map.get(n.parentId)!.children.push(map.get(n.id)!)
    } else {
      roots.push(map.get(n.id)!)
    }
  }
  return roots
}

export default async function StrutturaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireImpresaOUfficio()
  const { id } = await params

  const commessa = await prisma.commessa.findUnique({
    where: { id },
    select: { id: true, nome: true },
  })
  if (!commessa) notFound()

  let nodiFlat: {
    id: string; tipo: string; nome: string; codice: string | null
    piano: string | null; interno: string | null; attivo: boolean
    ordinamento: number; parentId: string | null
  }[] = []
  let migrazionePendente = false

  try {
    const rows = await prisma.cantiereStrutturaNodo.findMany({
      where: { commessaId: id },
      orderBy: [{ ordinamento: 'asc' }, { nome: 'asc' }],
      select: {
        id: true, tipo: true, nome: true, codice: true,
        piano: true, interno: true, attivo: true,
        ordinamento: true, parentId: true,
      },
    })
    nodiFlat = rows.map(n => ({ ...n, tipo: n.tipo as string }))
  } catch {
    migrazionePendente = true
  }

  const nodi = buildTree(nodiFlat)

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <PageHeader
        backHref={`/impresa/commesse/${id}`}
        backLabel={commessa.nome}
        title="Struttura cantiere"
        subtitle={migrazionePendente ? undefined : `${nodiFlat.length} zona${nodiFlat.length !== 1 ? 'e' : ''}`}
      />

      {migrazionePendente ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-6 text-center space-y-2">
          <p className="text-base font-bold text-amber-900">Migrazione DB in attesa</p>
          <p className="text-sm text-amber-700">
            La funzione struttura cantiere richiede l&apos;applicazione della migrazione SQL su Supabase.
            Eseguire il file <strong>struttura-cantiere-schema.sql</strong> su Supabase → SQL Editor.
          </p>
        </div>
      ) : (
        <StrutturaTree commessaId={id} nodi={nodi} />
      )}
    </div>
  )
}
