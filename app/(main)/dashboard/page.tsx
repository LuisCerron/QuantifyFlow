// /app/(main)/dashboard/page.tsx

// Importamos los componentes de UI y las acciones del servidor
import { AdminDashboard } from '@/components/dashboards/admin-dashboard';
import { MemberDashboard } from '@/components/dashboards/member-dashboard';
import { getAdminDashboardData, getMemberDashboardData, getUserRoleAndTeam } from './actions';

// Necesitamos una forma de obtener el usuario actual en el servidor.
// Esta función es un ejemplo; debes adaptarla a tu sistema de autenticación (ej. NextAuth, cookies).
import { getCurrentUser } from '@/lib/server-auth'; // <- ¡IMPORTANTE! Debes crear esta función
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login'); // Si no hay sesión, lo mandamos a iniciar sesión
  }

  // Obtenemos el rol y el equipo del usuario
  const membership = await getUserRoleAndTeam(user.uid);

  if (!membership) {
    return (
      <div>
        <h2>Bienvenido, {user.displayName || 'usuario'}</h2>
        <p>Parece que aún no eres parte de ningún equipo.</p>
        <p>Espera a que un administrador te envíe una invitación.</p>
      </div>
    );
  }

  if (membership.role === 'admin') {
    const adminData = await getAdminDashboardData(membership.teamId);
    // 👇 AQUÍ ESTÁ EL CAMBIO
    return <AdminDashboard userName={user.displayName ?? null} data={adminData} />;
  } else {
    const memberData = await getMemberDashboardData(user.uid);
    // 👇 Y AQUÍ TAMBIÉN
    return <MemberDashboard userName={user.displayName ?? null} tasks={memberData} />;
  }
}