// app/dashboard/page.tsx

import { AdminDashboard } from '@/components/dashboards/admin-dashboard';
import { MemberDashboard } from '@/components/dashboards/member-dashboard';
import { getUserRoleAndTeam } from './actions';
import { getUserDashboardData } from '@/services/memberService';

import { getCurrentUser } from '@/lib/server-auth';
import { redirect } from 'next/navigation';
import { getAdminDashboardData } from '@/services/adminService';
import Link from 'next/link';

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const membership = await getUserRoleAndTeam(user.uid);

  if (!membership) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-gray-50">
        <div className="max-w-xl">
          <h2 className="text-3xl font-bold mb-4">¡Bienvenido, {user.displayName || 'usuario'}!</h2>
          <p className="text-lg text-gray-700 mb-6">
            Parece que aún no eres parte de ningún equipo en ProjectHub.
          </p>
          <p className="text-gray-600 mb-8">
            Para empezar a trabajar, puedes crear tu propio equipo o unirte a uno existente.
          </p>
          <Link 
            href="/onboarding"
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
          >
            Comenzar Onboarding
          </Link>
        </div>
      </div>
    );
  }

  // Caso: El usuario es 'admin'.
  if (membership.role === 'admin') {
    const adminData = await getAdminDashboardData(membership.teamId);
    
    // ✨ CAMBIO IMPORTANTE: Validar si los datos del admin se cargaron correctamente.
    if (!adminData) {
      return (
        <div className="p-8 text-center">
          <h2 className="text-2xl font-bold text-red-600">Error al Cargar el Dashboard</h2>
          <p>No se pudieron obtener los datos del equipo. Por favor, contacta al soporte o intenta recargar la página.</p>
        </div>
      );
    }

    return <AdminDashboard userName={user.displayName ?? null} adminData={adminData} />;
  }
  
  // Caso: El usuario es 'member'.
  if (membership.role === 'member') {
    const memberData = await getUserDashboardData(user.uid);
    return <MemberDashboard userName={user.displayName ?? null} memberData={memberData} />;
  }

  // Caso fallback
  return <div>Rol no reconocido.</div>;
}