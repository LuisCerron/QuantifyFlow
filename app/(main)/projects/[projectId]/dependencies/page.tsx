import { notFound } from 'next/navigation';
import { getProjectById } from '@/services/projectService';
import { getProjectTasks } from '@/services/kanbanService';
import { getTaskDependencyGraph } from '@/services/dependencyService';
import DependencyGraphClient from './DependencyGraphClient';

export default async function DependenciesPage({
  params,
}: {
  params: { projectId: string };
}) {
  const project = await getProjectById(params.projectId);
  if (!project) return notFound();

  const tasks = await getProjectTasks(params.projectId, project.teamId);
  const graphData = await getTaskDependencyGraph(params.projectId, tasks);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Task Dependencies - {project.name}</h1>
      <DependencyGraphClient
        initialNodes={graphData.nodes}
        initialEdges={graphData.edges}
        projectId={params.projectId}
        teamId={project.teamId}
      />
    </div>
  );
}
