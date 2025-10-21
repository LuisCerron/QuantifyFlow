import Link from 'next/link';
import { Project } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { CheckSquare } from 'lucide-react';

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link href={`/projects/${project.id}`} legacyBehavior>
      <a className="block hover:scale-105 transition-transform duration-200">
        <Card className="h-full flex flex-col">
          <CardHeader>
            <CardTitle>{project.name}</CardTitle>
            <CardDescription className="line-clamp-2">{project.description}</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow" />
          <CardFooter>
            <div className="flex items-center text-sm text-muted-foreground">
              <CheckSquare className="mr-2 h-4 w-4" />
              <span>{project.taskCount ?? 0} Tareas</span>
            </div>
          </CardFooter>
        </Card>
      </a>
    </Link>
  );
}
