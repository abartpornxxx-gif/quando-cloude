import { prisma } from '@/lib/prisma'
import { requireImpresa } from '@/lib/auth'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { DeleteButton } from '@/components/DeleteButton'
import { eliminaCollaboratoreUfficio, ripristinaPasswordCollaboratore } from './actions'
import { ResetPasswordButton } from '@/components/ResetPasswordButton'

export default async function CollaboratoriUfficioPage() {
  await requireImpresa()
  const collaboratori = await prisma.collaboratoreUfficio.findMany({ 
    orderBy: { nome: 'asc' },
    select: {
      id: true,
      nome: true,
      email: true,
      primoAccesso: true,
      passwordResetRichiesto: true,
    }
  })

  return (
    <div>
      <PageHeader
        title="Collaboratori ufficio"
        subtitle={`${collaboratori.length} ${collaboratori.length === 1 ? 'collaboratore' : 'collaboratori'}`}
        action={
          <Link
            href="/impresa/collaboratori-ufficio/nuovo"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            + Nuovo
          </Link>
        }
      />

      {collaboratori.length === 0 ? (
        <EmptyState
          title="Nessun collaboratore ufficio"
          description="Aggiungi i collaboratori amministrativi per dargli accesso all'area ufficio (preventivi, ordini, fatture, pianificazione)."
          action={
            <Link
              href="/impresa/collaboratori-ufficio/nuovo"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              + Nuovo collaboratore
            </Link>
          }
        />
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-card overflow-hidden">
          <div className="divide-y divide-gray-100">
            {collaboratori.map(c => {
              const initials = c.nome.split(' ').slice(0, 2).map((w: string) => w[0] ?? '').join('').toUpperCase()
              return (
                <div key={c.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 hover:bg-gray-50/70 transition-colors group">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-sm font-bold shrink-0 select-none">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors truncate">{c.nome}</p>
                        
                        {/* Stato Accesso/Password Badges */}
                        {c.primoAccesso && c.passwordResetRichiesto ? (
                          <span className="inline-flex items-center rounded-md bg-yellow-50 px-1.5 py-0.5 text-[10px] font-bold text-yellow-700 ring-1 ring-inset ring-yellow-600/20">
                            Password temporanea consegnata
                          </span>
                        ) : c.primoAccesso && !c.passwordResetRichiesto ? (
                          <span className="inline-flex items-center rounded-md bg-orange-50 px-1.5 py-0.5 text-[10px] font-bold text-orange-700 ring-1 ring-inset ring-orange-600/20">
                            Primo accesso da completare
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                            Password personale impostata
                          </span>
                        )}
                      </div>
                      
                      {c.email && <p className="text-xs text-gray-400 mt-1">{c.email}</p>}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 sm:gap-3 pl-13 sm:pl-0 shrink-0">
                    <ResetPasswordButton id={c.id} nome={c.nome} action={ripristinaPasswordCollaboratore} />
                    <span className="text-gray-300 text-sm hidden sm:inline">|</span>
                    <Link href={`/impresa/collaboratori-ufficio/${c.id}`} className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors">
                      Modifica
                    </Link>
                    <span className="text-gray-300 text-sm hidden sm:inline">|</span>
                    <DeleteButton action={eliminaCollaboratoreUfficio.bind(null, c.id)} />
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

