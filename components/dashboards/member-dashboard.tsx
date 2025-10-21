import { cn } from '@/lib/utils';
import { UserDashboardData } from '@/types/dashboard-types';
// ✨ CAMBIO 1: Importamos los tipos necesarios para la Task con detalles
import { TaskWithDetails, Subtask } from '@/types/index';
import { Timestamp } from 'firebase/firestore';
import {
  Loader2, // Para el estado de carga
  ListChecks, // Para Tareas Totales
  Clock, // Para Pendientes
  Activity, // Para En Progreso
  CheckCircle2, // Para Completadas
  Square, // Para subtarea pendiente
  CheckSquare, // Para subtarea completada
  Users, // Para Mi Equipo
  History // Para Actividad Reciente
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
// --- Funciones Auxiliares ---

const formatDate = (dateValue: Date | Timestamp | undefined): string | null => {
  if (!dateValue) return null;
  if (typeof (dateValue as Timestamp).toDate === 'function') {
    return (dateValue as Timestamp).toDate().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  return (dateValue as Date).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// --- Componentes de Tarjetas para Mejor Organización ---

const StatCard = ({ title, value, icon: Icon }: { title: string; value: string | number; icon: React.ElementType }) => (
  <div className="bg-card border rounded-lg p-4 flex items-center gap-4 transition-colors hover:bg-accent hover:text-accent-foreground">
    <Icon className="w-8 h-8 text-primary" />
    <div>
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
    </div>
  </div>
);

const TaskCard = ({ task }: { task: TaskWithDetails }) => {
  const formattedDueDate = formatDate(task.dueDate);

  // Función para dar color a los badges de prioridad
  const getPriorityVariant = (priority: string): "default" | "destructive" | "secondary" => {
    switch (priority) {
      case 'alta': return 'destructive';
      case 'media': return 'secondary'; // 'secondary' suele ser amarillo/naranja en temas shadcn
      case 'baja': return 'default'; // 'default' suele ser gris
      default: return 'default';
    }
  };

  return (
    <div className={cn(
      "bg-card border rounded-lg p-4 border-l-4",
      "transition-all duration-200 ease-in-out hover:-translate-y-1 hover:shadow-md",
      // Color del borde basado en el estado (opcional pero recomendado)
      task.status === 'todo' && "border-l-primary",
      task.status === 'in-progress' && "border-l-blue-500", // O usa 'secondary' si lo prefieres
      task.status === 'done' && "border-l-green-600"
    )}>
      <h4 className="font-bold text-card-foreground">{task.title}</h4>
      <p className="text-sm text-muted-foreground mt-1">{task.description || "Sin descripción."}</p>

      <div className="text-sm text-muted-foreground mt-3 flex justify-between items-center flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span>Prioridad:</span>
          <Badge variant={getPriorityVariant(task.priority)} className="capitalize">{task.priority}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <span>Estado:</span>
          <Badge variant="outline" className="capitalize">{task.status.replace('-', ' ')}</Badge>
        </div>
      </div>

      {formattedDueDate && (
        <p className="text-sm text-muted-foreground mt-2">Vence: {formattedDueDate}</p>
      )}

      {/* SECCIÓN DE SUBTAREAS con iconos */}
      {task.subtasks && task.subtasks.length > 0 && (
        <div className="mt-4 pt-3 border-t">
          <h5 className="text-sm font-semibold text-foreground mb-2">Subtareas:</h5>
          <ul className="space-y-2">
            {task.subtasks.map((subtask: Subtask) => (
              <li key={subtask.id} className="flex items-center text-sm text-foreground">
                {subtask.completed ? (
                  <CheckSquare className="w-4 h-4 mr-2 text-primary" />
                ) : (
                  <Square className="w-4 h-4 mr-2 text-muted-foreground" />
                )}
                <span className={subtask.completed ? 'line-through text-muted-foreground' : ''}>
                  {subtask.title}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// --- Componente Principal del Dashboard ---

interface MemberDashboardProps {
  userName: string | null;
  memberData: UserDashboardData | null;
}

export function MemberDashboard({ userName, memberData }: MemberDashboardProps) {

  if (!memberData) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
          <h1 className="text-xl font-semibold text-foreground">Cargando dashboard...</h1>
          <p className="text-muted-foreground">Un momento, por favor.</p>
        </div>
      </div>
    );
  }

  const { user, teams, assignedTasks, activityLogs } = memberData;

  const tasksToDo = assignedTasks.filter(task => task.status === 'todo').length;
  const tasksInProgress = assignedTasks.filter(task => task.status === 'in-progress').length;
  const tasksDone = assignedTasks.filter(task => task.status === 'done').length;

  return (
    // ✨ Animación de entrada y paleta de fondo
    <div className="bg-background text-foreground p-6 font-sans animate-in fade-in duration-500">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Dashboard de {user.displayName}</h1>
        <p className="text-md text-muted-foreground">¡Bienvenido de nuevo! Aquí tienes un resumen de tu actividad.</p>
      </header>

      {/* ✨ Sección de Estadísticas con iconos */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Tareas Totales" value={assignedTasks.length} icon={ListChecks} />
        <StatCard title="Pendientes" value={tasksToDo} icon={Clock} />
        <StatCard title="En Progreso" value={tasksInProgress} icon={Activity} />
        <StatCard title="Completadas" value={tasksDone} icon={CheckCircle2} />
      </section>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        <div className="lg:col-span-2">
          <h2 className="text-2xl font-semibold mb-4 text-foreground">Mis Tareas Asignadas</h2>
          {assignedTasks.length > 0 ? (
            <div className="space-y-4"> {/* Añadido space-y para mejor separación */}
              {assignedTasks.map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          ) : (
            // ✨ Estado vacío mejorado
            <div className="bg-accent text-accent-foreground p-6 rounded-lg text-center">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-500" />
              <h3 className="text-lg font-semibold">¡Felicidades!</h3>
              <p>No tienes tareas asignadas. ¡Disfruta tu día!</p>
            </div>
          )}
        </div>

        {/* ✨ Aside con paleta shadcn e iconos */}
        <aside className="space-y-6">
          <div className="bg-card border rounded-lg p-4">
            <h3 className="text-xl font-semibold mb-3 text-card-foreground flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Mi Equipo
            </h3>
            {teams.length > 0 ? (
              <ul className="divide-y">
                {teams.map(team => (
                  <li key={team.id} className="py-2 text-card-foreground">
                    {team.teamName} {/* CAMBIO 3 Preservado */}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">Aún no eres miembro de ningún equipo.</p>
            )}
          </div>

          <div className="bg-card border rounded-lg p-4">
            <h3 className="text-xl font-semibold mb-3 text-card-foreground flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              Actividad Reciente
            </h3>
            {activityLogs.length > 0 ? (
              <ul className="divide-y">
                {activityLogs.slice(0, 5).map(log => (
                  <li key={log.id} className="text-sm py-2">
                    <p className="text-card-foreground capitalize">{log.action.replace('_', ' ')}</p>
                    <p className="text-muted-foreground text-xs mt-1">
                      {formatDate(log.createdAt)} {/* CAMBIO 4 Preservado */}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">No hay actividad reciente para mostrar.</p>
            )}
          </div>
        </aside>

      </main>
    </div>
  );
}