import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const role = user.user_metadata?.role
    if (role !== 'impresa' && role !== 'ufficio') {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
    }

    const operai = await prisma.operaio.findMany({
      select: {
        id: true,
        nome: true,
      },
      orderBy: {
        nome: 'asc',
      },
    })

    return NextResponse.json(operai)
  } catch (error) {
    console.error('Error fetching operai:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
