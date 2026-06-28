import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { AssistenteContestuale } from '@/components/ai/AssistenteContestuale'
import { LogoutButton } from '@/components/LogoutButton'
import { LiberoNav } from '@/components/LiberoNav'
import Image from 'next/image'
import Link from 'next/link'

export default async function LiberoLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.user_metadata?.role !== 'libero') redirect('/login')

  let nomeDisplay = user.user_metadata?.full_name || user.email || 'Professionista'

  if (user.email) {
    const libero = await prisma.liberoProfessionista.findFirst({
      where: { email: user.email },
      select: { nome: true },
    })
    if (libero) nomeDisplay = libero.nome
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="sticky top-0 z-40 bg-orange-800 text-white" style={{ boxShadow: '0 1px 0 rgba(255,255,255,0.06), 0 4px 20px rgba(0,0,0,0.25)' }}>
        <div className="mx-auto max-w-4xl px-4">
          <div className="flex h-16 items-center justify-between">
            <Link href="/libero/dashboard" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-600 shrink-0">
                <Image src="/immagini/logo-quadro.png" width={28} height={28} alt="QUADRO" className="rounded-lg" priority />
              </div>
              <div>
                <p className="font-bold text-sm leading-tight">QUADRO</p>
                <p className="text-orange-300 text-xs leading-tight">Libero professionista</p>
              </div>
            </Link>
            <div className="flex items-center gap-2">
              <span className="text-orange-200 text-xs hidden sm:block truncate max-w-[140px]">{nomeDisplay}</span>
              <LogoutButton className="rounded-lg px-3 py-1.5 text-sm font-medium text-orange-200 hover:bg-orange-700" />
            </div>
          </div>

          <LiberoNav />
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
      <AssistenteContestuale role="libero" />
    </div>
  )
}
