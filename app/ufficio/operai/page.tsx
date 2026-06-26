import { requireUfficio } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { DeleteButton } from '@/components/DeleteButton'
import { eliminaOperaioUfficio, ripristinaPasswordOperaio } from './actions'
import { ResetPasswordButton } from '@/components/ResetPasswordButton'

export default async function UfficioOperaiPage() {
  await requireUfficio()
  const operai = await prisma.operaio.findMany({
    orderBy: { nome: 'asc' },
    select: { 
      id: true, 
      nome: true, 
      ruolo: true, 
      zona: true, 
      email: true, 
      primoAccesso: true, 
      passwordResetRichiesto: true 
    },
  })

  return (
    <div>
      <PageHeader
        title="Operai"
        subtitle={`${operai.length} ${operai.length === 1 ? 'operaio' : 'operai'} in organico`}
        action={
          <Link href="/ufficio/operai/nuovo" className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700">
            + Nuovo
          </Link>
        }
      />

      {operai.length === 0 ? (
        <EmptyState title="Nessun operaio" description="Aggiungi il primo membro del team."
          action={<Link href="/ufficio/operai/nuovo" className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700">+ Nuovo operaio</Link>} />
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-card overflow-hidden">
          <div className="divide-y divide-gray-100">
            {operai.map(o => {
              const initials = o.nome.split(' ').slice(0, 2).map((w: string) => w[0] ?? '').join('').toUpperCase()
              return (
                <div key={o.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 hover:bg-gray-50/70 transition-colors group">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold shrink-0 select-none">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900 group-hover:text-teal-700 transition-colors truncate">{o.nome}</p>
                        
                        {/* Stato Accesso/Password Badges */}
                        {o.primoAccesso && o.passwordResetRichiesto ? (
                          <span className="inline-flex items-center rounded-md bg-yellow-50 px-1.5 py-0.5 text-[10px] font-bold text-yellow-700 ring-1 ring-inset ring-yellow-600/20">
                            Password temporanea consegnata
                          </span>
                        ) : o.primoAccesso && !o.passwordResetRichiesto ? (
                          <span className="inline-flex items-center rounded-md bg-orange-50 px-1.5 py-0.5 text-[10px] font-bold text-orange-700 ring-1 ring-inset ring-orange-600/20">
                            Primo accesso da completare
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                            Password personale impostata
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-400">
                        {o.ruolo && <span>{o.ruolo}</span>}
                        {o.ruolo && o.zona && <span>Â·</span>}
                        {o.zona && <span>{o.zona}</span>}
                        {!o.ruolo && !o.zona && <span>Nessun ruolo assegnato</span>}
                        {o.email && <span className="hidden sm:inline">Â· {o.email}</span>}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 sm:gap-3 pl-13 sm:pl-0 shrink-0">
                    <ResetPasswordButton id={o.id} nome={o.nome} action={ripristinaPasswordOperaio} />
                    <span className="text-gray-300 text-sm hidden sm:inline">|</span>
                    <Link href={`/ufficio/operai/${o.id}`} className="text-xs font-semibold text-teal-600 hover:text-teal-800">Modifica</Link>
                    <span className="text-gray-300 text-sm hidden sm:inline">|</span>
                    <DeleteButton action={eliminaOperaioUfficio.bind(null, o.id)} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

