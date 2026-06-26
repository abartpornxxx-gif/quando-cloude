import { requireCliente } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { richiediDiCo } from './actions'

export default async function RichiediDiCoPage() {
  const { cliente } = await requireCliente()

  const commesse = await prisma.commessa.findMany({
    where: { clienteId: cliente.id, stato: { in: ['finita', 'chiusa'] } },
    select: { id: true, nome: true, indirizzoCantiere: true },
    orderBy: { createdAt: 'desc' }
  })

  return (
    <div className="max-w-lg mx-auto space-y-6 pb-10">
      <div className="flex items-center gap-3">
        <Link href="/cliente/documenti" className="text-violet-600 hover:text-violet-800 text-sm font-semibold">‹ Documenti</Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Richiedi Di.Co.</h1>
        <p className="text-sm text-gray-500 mt-1">
          La Dichiarazione di Conformità (DM 37/08) è il documento ufficiale che certifica l'installazione a regola d'arte. 
          Richiedila ora alla nostra segreteria.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="p-1 bg-violet-600"></div>
        <form action={richiediDiCo} className="p-6 space-y-5">
          
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1">Seleziona il Cantiere *</label>
            <p className="text-xs text-gray-500 mb-3">La Di.Co. può essere emessa solo per lavori completati.</p>
            
            {commesse.length === 0 ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-sm text-amber-800 font-medium">Non ci sono cantieri completati per cui richiedere la Di.Co.</p>
              </div>
            ) : (
              <select 
                name="commessaId" 
                required 
                className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              >
                <option value="">-- Scegli un cantiere --</option>
                {commesse.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nome} {c.indirizzoCantiere ? `(${c.indirizzoCantiere})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1">Note opzionali</label>
            <textarea 
              name="note" 
              rows={3} 
              placeholder="Es. Mi serve per il rogito del notaio del 15 Ottobre..."
              className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            ></textarea>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 mt-4">
            <span className="text-xl">ℹ️</span>
            <p className="text-xs text-blue-800 leading-relaxed">
              La tua richiesta verrà presa in carico dal nostro ufficio tecnico. 
              Verificheremo la documentazione e ti invieremo la Di.Co. ufficiale via email appena pronta.
            </p>
          </div>

          <button 
            type="submit" 
            disabled={commesse.length === 0}
            className="w-full py-3.5 mt-2 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
          >
            Invia Richiesta
          </button>
        </form>
      </div>
    </div>
  )
}
