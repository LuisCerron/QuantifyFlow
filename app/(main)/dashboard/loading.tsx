// app/dashboard/loading.tsx

// Puedes crear un componente de spinner o esqueleto más elaborado
export default function DashboardLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="p-8 text-center">
        <h2 className="text-2xl font-semibold">Cargando tu Dashboard...</h2>
        <p className="text-gray-600">Estamos preparando tu espacio de trabajo.</p>
        {/* Aquí podrías agregar un spinner visual */}
      </div>
    </div>
  );
}