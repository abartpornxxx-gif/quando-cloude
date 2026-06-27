import { NextResponse } from 'next/server'

export async function GET() {
  const email = process.env.SUPERADMIN_EMAIL ?? ''
  const password = process.env.SUPERADMIN_PASSWORD ?? ''
  return NextResponse.json({
    email_len: email.length,
    email_first3: email.slice(0, 3),
    email_last3: email.slice(-3),
    password_len: password.length,
    password_first3: password.slice(0, 3),
    password_last3: password.slice(-3),
    password_charCodes_tail: [...password.slice(-4)].map(c => c.charCodeAt(0)),
  })
}
