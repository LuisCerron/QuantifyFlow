import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  getDoc,
} from 'firebase/firestore';
import { chunkArray } from '@/lib/utils/helpers';
import { serializeForClient } from '@/lib/utils/serializer';

// ===== CRUD =====

export async function createDependency(
  fromTaskId: string,
  toTaskId: string,
  type: DependencyType,
  projectId: string,
  teamId: string,
  userId: string
): Promise<TaskDependency> {
  if (fromTaskId === toTaskId) {
    throw new Error('A task cannot depend on itself');
  }

  // 1. Validate no cycle (only for blocks/precedes)
  if (type === 'blocks' || type === 'precedes') {
    const wouldCreateCycle = await checkCycle(toTaskId, fromTaskId);
    if (wouldCreateCycle)
      throw new Error('Creating this dependency would form a cycle');
  }

  // 2. Check same project
  const [fromTaskSnap, toTaskSnap] = await Promise.all([
    getDoc(doc(db, 'tasks', fromTaskId)),
    getDoc(doc(db, 'tasks', toTaskId)),
  ]);

  if (!fromTaskSnap.exists() || !toTaskSnap.exists()) {
    throw new Error('One or both tasks do not exist');
  }

  const fromProjectId = fromTaskSnap.data().projectId;
  const toProjectId = toTaskSnap.data().projectId;

  if (fromProjectId !== projectId || toProjectId !== projectId) {
    throw new Error('Both tasks must belong to the same project');
  }

  // 3. Create
  const docRef = await addDoc(collection(db, 'taskDependencies'), {
    fromTaskId,
    toTaskId,
    type,
    projectId,
    teamId,
    createdBy: userId,
    createdAt: new Date().toISOString(),
  });

  await logActivity({
    teamId,
    projectId,
    userId,
    action: ActivityAction.DEPENDENCY_CREATED,
    details: { dependencyId: docRef.id, fromTaskId, toTaskId, type },
  });

  return serializeForClient({
    id: docRef.id,
    fromTaskId,
    toTaskId,
    type,
    projectId,
    teamId,
    createdBy: userId,
    createdAt: new Date().toISOString(),
  });
}

export async function removeDependency(
  dependencyId: string,
  teamId: string,
  projectId: string,
  userId: string
): Promise<void> {
  await deleteDoc(doc(db, 'taskDependencies', dependencyId));

  await logActivity({
    teamId,
    projectId,
    userId,
    action: ActivityAction.DEPENDENCY_REMOVED,
    details: { dependencyId },
  });
}

// ===== QUERIES =====

export async function getTaskDependencies(
  taskId: string
): Promise<TaskDependency[]> {
  const [fromDeps, toDeps] = await Promise.all([
    getDocs(
      query(
        collection(db, 'taskDependencies'),
        where('fromTaskId', '==', taskId)
      )
    ),
    getDocs(
      query(
        collection(db, 'taskDependencies'),
        where('toTaskId', '==', taskId)
      )
    ),
  ]);

  return [...fromDeps.docs, ...toDeps.docs].map((d) =>
    serializeForClient({ id: d.id, ...d.data() } as TaskDependency)
  );
}

export async function getBlockedByTasks(
  taskId: string
): Promise<TaskDependency[]> {
  const snapshot = await getDocs(
    query(
      collection(db, 'taskDependencies'),
      where('toTaskId', '==', taskId),
      where('type', '==', 'blocks')
    )
  );
  return snapshot.docs.map((d) =>
    serializeForClient({ id: d.id, ...d.data() } as TaskDependency)
  );
}

export async function getBlockingTasks(
  taskId: string
): Promise<TaskDependency[]> {
  const snapshot = await getDocs(
    query(
      collection(db, 'taskDependencies'),
      where('fromTaskId', '==', taskId),
      where('type', '==', 'blocks')
    )
  );
  return snapshot.docs.map((d) =>
    serializeForClient({ id: d.id, ...d.data() } as TaskDependency)
  );
}

export async function getProjectDependencies(
  projectId: string
): Promise<TaskDependency[]> {
  const snapshot = await getDocs(
    query(
      collection(db, 'taskDependencies'),
      where('projectId', '==', projectId)
    )
  );
  return snapshot.docs.map((d) =>
    serializeForClient({ id: d.id, ...d.data() } as TaskDependency)
  );
}

export async function hasDependents(taskId: string): Promise<boolean> {
  const snapshot = await getDocs(
    query(
      collection(db, 'taskDependencies'),
      where('fromTaskId', '==', taskId)
    )
  );
  return !snapshot.empty;
}

export async function hasActiveBlockers(
  taskId: string,
  taskStatusMap: Map<string, string>
): Promise<{ hasBlockers: boolean; blockerIds: string[] }> {
  const blockers = await getBlockedByTasks(taskId);
  const activeBlockerIds = blockers
    .filter((dep) => {
      const status = taskStatusMap.get(dep.fromTaskId);
      return status !== 'done';
    })
    .map((dep) => dep.fromTaskId);

  return {
    hasBlockers: activeBlockerIds.length > 0,
    blockerIds: activeBlockerIds,
  };
}

// ===== CYCLE DETECTION =====

async function checkCycle(
  startTaskId: string,
  targetTaskId: string
): Promise<boolean> {
  const visited = new Set<string>();
  const queue = [targetTaskId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === startTaskId) return true;
    if (visited.has(current)) continue;
    visited.add(current);

    const deps = await getDocs(
      query(
        collection(db, 'taskDependencies'),
        where('fromTaskId', '==', current),
        where('type', 'in', ['blocks', 'precedes'])
      )
    );

    deps.docs.forEach((d) => {
      const toId = d.data().toTaskId;
      if (!visited.has(toId)) queue.push(toId);
    });
  }

  return false;
}

// ===== BATCH SUMMARY =====

export interface TaskDependencySummary {
  blockedBy: number;
  blocking: number;
  related: number;
  isBlocked: boolean;
}

export async function getTasksDependencySummary(
  projectId: string,
  taskIds: string[],
  taskStatusMap: Map<string, string>
): Promise<Map<string, TaskDependencySummary>> {
  if (taskIds.length === 0) return new Map();

  const deps = await getProjectDependencies(projectId);
  const map = new Map<string, TaskDependencySummary>();

  taskIds.forEach((id) => {
    const blockedBy = deps.filter(
      (d) => d.toTaskId === id && d.type === 'blocks'
    );
    const blocking = deps.filter(
      (d) => d.fromTaskId === id && d.type === 'blocks'
    );
    const related = deps.filter(
      (d) =>
        (d.fromTaskId === id || d.toTaskId === id) && d.type === 'relates_to'
    );

    const activeBlockers = blockedBy.filter(
      (d) => taskStatusMap.get(d.fromTaskId) !== 'done'
    );

    map.set(id, {
      blockedBy: blockedBy.length,
      blocking: blocking.length,
      related: related.length,
      isBlocked: activeBlockers.length > 0,
    });
  });

  return map;
}

// ===== GRAPH DATA =====

export async function getTaskDependencyGraph(
  projectId: string,
  tasks: TaskWithDetails[]
): Promise<DependencyGraphData> {
  const dependencies = await getProjectDependencies(projectId);

  const taskIds = tasks.map((t) => t.id);
  const cols = Math.ceil(Math.sqrt(taskIds.length || 1));

  const nodes = tasks.map((task, index) => ({
    id: task.id,
    position: {
      x: (index % cols) * 250,
      y: Math.floor(index / cols) * 150,
    },
    data: task,
  }));

  const edges = dependencies.map((dep) => ({
    id: dep.id,
    source: dep.fromTaskId,
    target: dep.toTaskId,
    type: dep.type,
  }));

  return { nodes, edges };
}
