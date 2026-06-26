import { NextResponse } from 'next/server'
import { callAI } from '@/lib/ai/client'

export async function GET() {
  try {
    const res = await callAI('Sei un test.', 'Rispondi ciao.')
    return NextResponse.json({ success: true, res })
  } catch (err: any) {
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 })
  }
}
