// components/dashboards/admin-dashboard.tsx

import { AdminDashboardData, TeamMemberWithDetails } from "@/types/dashboard-types";
import { Project, ActivityLog } from "@/types";
import { Timestamp } from "firebase/firestore";

// --- Funciones Auxiliares ---

// Función para formatear fechas, la reutilizamos
const formatDate = (dateValue: Date | Timestamp | undefined): string | null => {
  if (!dateValue) return null;
  // Usamos 'es-ES' para un formato de fecha común en español
  const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'long', year: 'numeric' };
  if (typeof (dateValue as Timestamp).toDate === 'function') {
    return (dateValue as Timestamp).toDate().toLocaleDateString('es-ES', options);
  }
  return (dateValue as Date).toLocaleDateString('es-ES', options);
};

// --- Sub-Componentes para Mejor Organización ---

const StatCard = ({ title, value, icon }: { title: string; value: string | number; icon: string }) => (
  <div className="bg-white shadow-md rounded-lg p-5 flex items-center">
    <div className="bg-indigo-500 text-white rounded-full p-3 mr-4">
      <span className="text-2xl">{icon}</span>
    </div>
    <div>
      <h3 className="text-lg font-semibold text-gray-600">{title}</h3>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  </div>
);

const ProjectCard = ({ project }: { project: Project }) => (
  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
    <h4 className="font-bold text-indigo-700">{project.name}</h4>
    <p className="text-sm text-gray-600 mt-1">{project.description || "Sin descripción."}</p>
    <div className="text-xs text-gray-400 mt-2">
      <span>Tareas: {project.taskCount || 0}</span> | <span>Estado: <span className="capitalize">{project.status}</span></span>
    </div>
  </div>
);

const MemberListItem = ({ member }: { member: TeamMemberWithDetails }) => (
  <li className="flex items-center justify-between py-2 border-b last:border-b-0">
    <div>
      <p className="font-semibold text-gray-800">{member.displayName}</p>
      <p className="text-sm text-gray-500">{member.email}</p>
    </div>
    <span className="text-sm font-medium bg-gray-200 text-gray-700 px-2 py-1 rounded-full capitalize">
      {member.role}
    </span>
  </li>
);

// --- Componente Principal del Dashboard ---

interface AdminDashboardProps {
  userName: string | null;
  // Permitimos que adminData sea null para manejar el estado de carga/error
  adminData: AdminDashboardData | null;
}

export function AdminDashboard({ userName, adminData }: AdminDashboardProps) {
  
  // Manejo de estado nulo (si los datos aún no llegan o hubo un error)
  if (!adminData) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold mb-4">Cargando dashboard para el equipo...</h1>
        <p>Si este mensaje persiste, puede que haya ocurrido un error al cargar los datos.</p>
      </div>
    );
  }

  // Desestructuramos los datos para un acceso más fácil
  const { team, members, projects, tasks, recentActivity } = adminData;

  // Calculamos las estadísticas a partir de las tareas totales
  const tasksToDo = tasks.filter(t => t.status === 'todo').length;
  const tasksInProgress = tasks.filter(t => t.status === 'in-progress').length;

  return (
    <div className="bg-gray-50 p-6 font-sans min-h-screen">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard del Equipo: {team.teamName}</h1>
        <p className="text-md text-gray-600">Hola {userName}, aquí tienes el resumen general del equipo.</p>
      </header>

      {/* Sección de Estadísticas Clave */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Miembros Totales" value={members.length} icon="👥" />
        <StatCard title="Proyectos Activos" value={projects.filter(p => p.status === 'active').length} icon="📂" />
        <StatCard title="Tareas Pendientes" value={tasksToDo} icon="📝" />
        <StatCard title="Tareas en Progreso" value={tasksInProgress} icon="⏳" />
      </section>

      {/* Contenedor Principal de Contenido */}
      <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Columna Central: Proyectos */}
        <div className="lg:col-span-2">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">Proyectos del Equipo</h2>
          {projects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map(project => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          ) : (
            <p className="bg-white p-4 rounded-lg text-gray-500">Aún no se han creado proyectos para este equipo.</p>
          )}
        </div>

        {/* Columna Lateral: Miembros y Actividad */}
        <aside>
          <div className="bg-white shadow-md rounded-lg p-4 mb-6">
            <h3 className="text-xl font-semibold mb-3 text-gray-800">Miembros del Equipo</h3>
            {members.length > 0 ? (
              <ul>
                {members.map(member => <MemberListItem key={member.uid} member={member} />)}
              </ul>
            ) : (
              <p className="text-gray-500">No hay miembros en este equipo.</p>
            )}
          </div>

          <div className="bg-white shadow-md rounded-lg p-4">
            <h3 className="text-xl font-semibold mb-3 text-gray-800">Actividad Reciente</h3>
            {recentActivity.length > 0 ? (
              <ul>
                {recentActivity.map(log => (
                  <li key={log.id} className="text-sm py-2 border-b last:border-b-0">
                    <p className="text-gray-700 capitalize">{log.action.replace('_', ' ')}</p>
                    <p className="text-gray-400 text-xs">{formatDate(log.createdAt)}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">No hay actividad reciente para mostrar.</p>
            )}
          </div>
        </aside>

      </main>
    </div>
  );
}