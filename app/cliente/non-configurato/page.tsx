export default function ClienteNonConfigurato() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="text-5xl mb-4">⚙️</div>
      <h1 className="text-xl font-bold text-gray-800 mb-2">Account non ancora collegato</h1>
      <p className="text-gray-500 text-sm max-w-sm">
        Il tuo account non è ancora associato a un profilo cliente nel sistema.
        Contatta l&apos;impresa per completare la configurazione.
      </p>
    </div>
  )
}
