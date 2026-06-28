import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createHash } from 'crypto'
import { AdminLogoutButton } from './AdminLogoutButton'
import { AdminNav } from '@/components/AdminNav'
import { Shield } from 'lucide-react'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const adminCookie = cookieStore.get('_qdr_admin')
  const adminEmail = process.env.SUPERADMIN_EMAIL
  const adminPassword = process.env.SUPERADMIN_PASSWORD

  if (!adminCookie || !adminEmail || !adminPassword) redirect('/pannello')
  const expected = createHash('sha256').update(`${adminEmail.trim()}:${adminPassword.trim()}`).digest('hex')
  if (adminCookie.value !== expected) redirect('/pannello')

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="sticky top-0 z-40 bg-purple-900 text-white" style={{ boxShadow: '0 1px 0 rgba(255,255,255,0.06), 0 4px 20px rgba(0,0,0,0.28)' }}>
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-600 shrink-0">
                <Shield size={16} />
              </div>
              <div>
                <p className="font-bold text-sm leading-tight">QUADRO Admin</p>
                <p className="text-purple-300 text-xs leading-tight">Pannello di controllo piattaforma</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-purple-300 text-xs hidden sm:block">{adminEmail}</span>
              <AdminLogoutButton className="rounded-lg px-3 py-1.5 text-sm font-medium text-purple-200 hover:bg-purple-800 transition-colors" />
            </div>
          </div>

          <AdminNav />
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-8">
        {children}
      </main>
    </div>
  )
}
