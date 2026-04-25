'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  createDependency,
  removeDependency,
  getTaskDependencies,
} from '@/services/dependencyService';
import type { TaskDependency, DependencyType } from '@/types';

export function useTaskDependencies(
  taskId: string | null,
  projectId: string | null
) {
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDependencies = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    try {
      const deps = await getTaskDependencies(taskId);
      setDependencies(deps);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load dependencies'
      );
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchDependencies();
  }, [fetchDependencies]);

  const addDependency = useCallback(
    async (
      fromTaskId: string,
      toTaskId: string,
      type: DependencyType,
      teamId: string,
      userId: string
    ) => {
      if (!projectId) return;
      try {
        const dep = await createDependency(
          fromTaskId,
          toTaskId,
          type,
          projectId,
          teamId,
          userId
        );
        setDependencies((prev) => [...prev, dep]);
        return dep;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to create dependency'
        );
        throw err;
      }
    },
    [projectId]
  );

  const deleteDependency = useCallback(
    async (dependencyId: string, teamId: string, userId: string) => {
      if (!projectId) return;
      try {
        await removeDependency(dependencyId, teamId, projectId, userId);
        setDependencies((prev) => prev.filter((d) => d.id !== dependencyId));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to remove dependency'
        );
        throw err;
      }
    },
    [projectId]
  );

  const blockedBy = dependencies.filter(
    (d) => d.toTaskId === taskId && d.type === 'blocks'
  );
  const blocking = dependencies.filter(
    (d) => d.fromTaskId === taskId && d.type === 'blocks'
  );
  const related = dependencies.filter((d) => d.type === 'relates_to');
  const precedes = dependencies.filter((d) => d.type === 'precedes');
  const duplicates = dependencies.filter((d) => d.type === 'duplicates');

  return {
    dependencies,
    blockedBy,
    blocking,
    related,
    precedes,
    duplicates,
    loading,
    error,
    fetchDependencies,
    addDependency,
    deleteDependency,
  };
}
