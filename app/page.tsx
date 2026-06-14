import { redirect } from 'next/navigation'

// Il middleware gestisce il redirect in base al ruolo, questa è una fallback
export default function RootPage() {
  redirect('/login')
}
