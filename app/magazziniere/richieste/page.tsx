import { requireMagazziniere } from '@/lib/auth'
import Image from 'next/image'
import { prisma } from '@/lib/prisma'

export default async function RichiestePage() {
  await requireMagazziniere()

  const richieste = await prisma.richiestaMateriale.findMany({
    include: {
      operaio: { select: { nome: true } },
      commessa: { select: { nome: true } },
    },
    orderBy: [{ stato: 'asc' }, { urgente: 'desc' }, { createdAt: 'asc' }],
  })

  const statoLabel: Record<string, string> = {
    richiesta: 'Aperta',
    in_preparazione: 'In prep.',
    consegnata: 'Consegnata',
  }
  const statoBg: Record<string, string> = {
    richiesta: 'bg-red-100 text-red-700',
    in_preparazione: 'bg-yellow-100 text-yellow-700',
    consegnata: 'bg-green-100 text-green-700',
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold mb-4">Tutte le richieste</h1>
      <div className="bg-white rounded-xl border divide-y">
        {richieste.length === 0 ? (
          <p className="p-4 text-gray-400 text-sm">Nessuna richiesta</p>
        ) : richieste.map(r => (
          <a key={r.id} href={`/magazziniere/richieste/${r.id}`} className="block p-4 hover:bg-gray-50">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                {r.urgente && <Image src="/immagini/icona-urgente.png" width={13} height={13} alt="urgente" className="shrink-0 inline-block mr-1" />}
                <span className="text-sm font-medium">{r.descrizione}</span>
                <p className="text-xs text-gray-500 mt-0.5">
                  {r.operaio.nome} · {r.commessa.nome} · {new Date(r.createdAt).toLocaleString('it-IT')}
                </p>
              </div>
              <span className={['text-xs px-2 py-1 rounded-full shrink-0', statoBg[r.stato] ?? ''].join(' ')}>
                {statoLabel[r.stato] ?? r.stato}
              </span>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
