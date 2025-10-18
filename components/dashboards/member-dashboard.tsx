// components/dashboards/member-dashboard.tsx
import type { MemberTask } from '@/app/(main)/dashboard/actions';

interface MemberDashboardProps {
  userName: string | null;
  tasks: MemberTask[];
}

export function MemberDashboard({ userName, tasks }: MemberDashboardProps) {
  return (
    <div>
      <h1>Mi Dashboard</h1>
      <p>Bienvenido, {userName || 'Miembro'}. Aquí están tus tareas asignadas:</p>

      {tasks.length > 0 ? (
        <ul>
          {tasks.map(task => (
            <li key={task.id}>
              <strong>{task.titulo}</strong> - Estado: {task.estado}, Prioridad: {task.prioridad}
            </li>
          ))}
        </ul>
      ) : (
        <p>¡Felicidades! No tienes tareas pendientes.</p>
      )}
    </div>
  );
}