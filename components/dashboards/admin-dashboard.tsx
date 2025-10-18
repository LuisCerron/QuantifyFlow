// components/dashboards/admin-dashboard.tsx
import type { AdminDashboardData } from '@/app/(main)/dashboard/actions';

interface AdminDashboardProps {
  userName: string | null;
  data: AdminDashboardData;
}

export function AdminDashboard({ userName, data }: AdminDashboardProps) {
  return (
    <div>
      <h1>Dashboard del Administrador</h1>
      <p>Bienvenido, {userName || 'Admin'}. Aquí tienes un resumen del equipo:</p>
      
      <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
        <div style={{ border: '1px solid #ccc', padding: '15px' }}>
          <h2>{data.projectCount}</h2>
          <p>Proyectos Activos</p>
        </div>
        <div style={{ border: '1px solid #ccc', padding: '15px' }}>
          <h2>{data.taskStats.completed} / {data.taskStats.pending + data.taskStats.inProgress + data.taskStats.completed}</h2>
          <p>Tareas Completadas</p>
        </div>
        <div style={{ border: '1px solid #ccc', padding: '15px' }}>
          <h2>{data.totalHoursLogged}</h2>
          <p>Horas Registradas</p>
        </div>
      </div>
    </div>
  );
}