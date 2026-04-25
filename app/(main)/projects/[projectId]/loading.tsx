import BoardSkeleton from "@/components/projects/kanban/BoardSkeleton";

export default function ProjectsLoading() {
  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8 2xl:px-12">
      <BoardSkeleton />
    </div>
  );
}