'use client'

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      style={{
        background: '#1d4ed8',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        padding: '9px 22px',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: 600,
      }}
    >
      🖨 Stampa / Salva come PDF
    </button>
  )
}
