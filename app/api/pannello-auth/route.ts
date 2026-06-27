import { NextResponse } from 'next/server'
import { createHash } from 'crypto'

function makeToken(email: string, password: string) {
  return createHash('sha256').update(`${email}:${password}`).digest('hex')
}

export async function POST(req: Request) {
  const { email, password } = await req.json()

  const adminEmail = process.env.SUPERADMIN_EMAIL
  const adminPassword = process.env.SUPERADMIN_PASSWORD

  if (!adminEmail || !adminPassword || email !== adminEmail || password !== adminPassword) {
    return NextResponse.json({ error: 'Credenziali non valide' }, { status: 401 })
  }

  const token = makeToken(adminEmail, adminPassword)

  const res = NextResponse.json({ ok: true })
  res.cookies.set('_qdr_admin', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete('_qdr_admin')
  return res
}
