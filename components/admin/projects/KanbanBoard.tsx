"use client";
import { useState, useCallback } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import TaskDetailPanel from "./TaskDetailPanel";

type PmColumn = { id: string; name: string; taskIds: string[] };
type PmTask = {
  _id: string;
  projectId: string;
  columnId: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  dueDate: string | null;
  assignee: string | null;
  clientRef: string | null;
  driveFileId: string | null;
  driveFileUrl: string | null;
  driveFileName: string | null;
  _createdAt: string;
};
type PmProject = {
  _id: string;
  name: string;
  description: string;
  status: string;
  dueDate: string | null;
  clientRef: string | null;
  columns: PmColumn[];
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "text-white/40 bg-white/5",
  medium: "text-yellow-400 bg-yellow-400/10",
  high: "text-red-400 bg-red-400/10",
};

function TaskCard({
  task,
  onClick,
  isOverlay,
}: {
  task: PmTask;
  onClick?: () => void;
  isOverlay?: boolean;
}) {
  const isOverdue =
    task.dueDate && new Date(task.dueDate) < new Date() && task.columnId !== "done";

  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-xl border bg-[#0d0d0d] cursor-pointer transition-all select-none ${
        isOverlay
          ? "border-sky-500/40 shadow-lg shadow-black/40 rotate-1 opacity-90"
          : "border-white/8 hover:border-white/20 hover:bg-white/3"
      }`}
    >
      <p className="text-sm text-white leading-snug mb-2">{task.title}</p>
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-md ${PRIORITY_COLORS[task.priority]}`}>
          {task.priority}
        </span>
        {task.dueDate && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${isOverdue ? "text-red-400 bg-red-400/10" : "text-white/30 bg-white/5"}`}>
            {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        )}
        {task.assignee && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-md text-sky-400 bg-sky-400/10 truncate max-w-[80px]">
            {task.assignee}
          </span>
        )}
        {task.driveFileId && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-md text-white/30 bg-white/5">📎</span>
        )}
      </div>
    </div>
  );
}

function SortableTaskCard({
  task,
  onClick,
}: {
  task: PmTask;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task._id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0 : 1,
      }}
      {...attributes}
      {...listeners}
    >
      <TaskCard task={task} onClick={onClick} />
    </div>
  );
}

function Column({
  column,
  tasks,
  onTaskClick,
  onAddTask,
  addingIn,
  newTaskTitle,
  onNewTaskTitleChange,
  onNewTaskSubmit,
  onNewTaskCancel,
}: {
  column: PmColumn;
  tasks: PmTask[];
  onTaskClick: (task: PmTask) => void;
  onAddTask: (colId: string) => void;
  addingIn: string | null;
  newTaskTitle: string;
  onNewTaskTitleChange: (v: string) => void;
  onNewTaskSubmit: (colId: string) => void;
  onNewTaskCancel: () => void;
}) {
  return (
    <div className="flex-shrink-0 w-72 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white/80">{column.name}</span>
          <span className="text-xs text-white/30 bg-white/5 rounded-full px-2 py-0.5">
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => onAddTask(column.id)}
          className="text-white/30 hover:text-white/70 transition-colors text-lg leading-none"
          title="Add task"
        >
          +
        </button>
      </div>

      <SortableContext items={tasks.map((t) => t._id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 min-h-[60px]">
          {tasks.map((task) => (
            <SortableTaskCard key={task._id} task={task} onClick={() => onTaskClick(task)} />
          ))}
        </div>
      </SortableContext>

      {addingIn === column.id ? (
        <div className="mt-2">
          <input
            autoFocus
            value={newTaskTitle}
            onChange={(e) => onNewTaskTitleChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onNewTaskSubmit(column.id);
              if (e.key === "Escape") onNewTaskCancel();
            }}
            placeholder="Task title…"
            className="w-full px-3 py-2 rounded-xl bg-white/5 border border-sky-500/40 text-white text-sm placeholder-white/20 outline-none"
          />
          <div className="flex gap-2 mt-1.5">
            <button
              onClick={() => onNewTaskSubmit(column.id)}
              disabled={!newTaskTitle.trim()}
              className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-black text-xs font-semibold transition-colors"
            >
              Add
            </button>
            <button
              onClick={onNewTaskCancel}
              className="px-3 py-1.5 rounded-lg text-white/40 hover:text-white text-xs transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => onAddTask(column.id)}
          className="mt-2 w-full px-3 py-2 rounded-xl text-white/25 hover:text-white/60 hover:bg-white/4 text-sm transition-all text-left"
        >
          + Add task
        </button>
      )}
    </div>
  );
}

export default function KanbanBoard({
  project,
  initialTasks,
}: {
  project: PmProject;
  initialTasks: PmTask[];
}) {
  const [columns, setColumns] = useState<PmColumn[]>(project.columns ?? []);
  const [tasks, setTasks] = useState<PmTask[]>(initialTasks);
  const [activeTask, setActiveTask] = useState<PmTask | null>(null);
  const [selectedTask, setSelectedTask] = useState<PmTask | null>(null);
  const [addingIn, setAddingIn] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [savingTask, setSavingTask] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Build task maps
  const tasksById = Object.fromEntries(tasks.map((t) => [t._id, t]));

  function getTasksForColumn(col: PmColumn): PmTask[] {
    return (col.taskIds ?? [])
      .map((id) => tasksById[id])
      .filter(Boolean) as PmTask[];
  }

  function findColumnOfTask(taskId: string): PmColumn | undefined {
    return columns.find((c) => (c.taskIds ?? []).includes(taskId));
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveTask(tasksById[event.active.id as string] ?? null);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const sourceCol = findColumnOfTask(activeId);
    let targetCol = columns.find((c) => c.id === overId);
    if (!targetCol) targetCol = findColumnOfTask(overId);

    if (!sourceCol || !targetCol || sourceCol.id === targetCol.id) return;

    setColumns((cols) =>
      cols.map((col) => {
        if (col.id === sourceCol.id) {
          return { ...col, taskIds: col.taskIds.filter((id) => id !== activeId) };
        }
        if (col.id === targetCol!.id) {
          const overIndex = col.taskIds.indexOf(overId);
          const newIds = [...col.taskIds];
          if (overIndex >= 0) {
            newIds.splice(overIndex, 0, activeId);
          } else {
            newIds.push(activeId);
          }
          return { ...col, taskIds: newIds };
        }
        return col;
      })
    );

    // Update the task's columnId in local state
    setTasks((ts) =>
      ts.map((t) => (t._id === activeId ? { ...t, columnId: targetCol!.id } : t))
    );
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) {
      // Reset to server state
      setColumns(project.columns);
      setTasks(initialTasks);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    // Re-sort within same column if needed
    const sourceCol = findColumnOfTask(activeId);
    if (sourceCol && sourceCol.taskIds.includes(overId) && activeId !== overId) {
      const oldIndex = sourceCol.taskIds.indexOf(activeId);
      const newIndex = sourceCol.taskIds.indexOf(overId);
      const newTaskIds = arrayMove(sourceCol.taskIds, oldIndex, newIndex);
      const newCols = columns.map((c) =>
        c.id === sourceCol.id ? { ...c, taskIds: newTaskIds } : c
      );
      setColumns(newCols);
      await persistColumns(newCols);
    } else {
      await persistColumns(columns);
    }
  }

  async function persistColumns(cols: PmColumn[]) {
    try {
      await fetch(`/api/admin/pm/projects/${project._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columns: cols }),
      });
    } catch {
      // Silently fail — board state is still correct locally
    }
  }

  async function handleAddTask(colId: string) {
    if (!newTaskTitle.trim() || savingTask) return;
    setSavingTask(true);
    try {
      const res = await fetch(`/api/admin/pm/projects/${project._id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTaskTitle.trim(), columnId: colId }),
      });
      const task: PmTask = await res.json();
      if (!res.ok) return;
      setTasks((ts) => [...ts, task]);
      setColumns((cols) =>
        cols.map((c) =>
          c.id === colId ? { ...c, taskIds: [...(c.taskIds ?? []), task._id] } : c
        )
      );
      setNewTaskTitle("");
      setAddingIn(null);
    } finally {
      setSavingTask(false);
    }
  }

  const handleTaskUpdated = useCallback((updated: PmTask) => {
    setTasks((ts) => ts.map((t) => (t._id === updated._id ? updated : t)));
    setSelectedTask(updated);
  }, []);

  const handleTaskDeleted = useCallback(
    (taskId: string) => {
      setTasks((ts) => ts.filter((t) => t._id !== taskId));
      setColumns((cols) =>
        cols.map((c) => ({ ...c, taskIds: (c.taskIds ?? []).filter((id) => id !== taskId) }))
      );
      setSelectedTask(null);
    },
    []
  );

  return (
    <div className="flex flex-col h-full -mx-4 lg:-mx-8">
      {/* Header */}
      <div className="px-4 lg:px-8 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/admin/projects"
            className="text-white/30 hover:text-white/70 transition-colors text-sm flex-shrink-0"
          >
            ← Projects
          </Link>
          <span className="text-white/20">/</span>
          <h1 className="text-lg font-semibold text-white truncate">{project.name}</h1>
          {project.status !== "active" && (
            <span className="flex-shrink-0 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full text-white/40 bg-white/5">
              {project.status}
            </span>
          )}
        </div>
        <Link
          href={`/admin/projects/${project._id}/settings`}
          className="flex-shrink-0 text-xs text-white/30 hover:text-white/70 transition-colors px-3 py-1.5 rounded-lg border border-white/8 hover:border-white/20"
        >
          Settings
        </Link>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto px-4 lg:px-8">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-5 pb-8 min-h-[60vh]">
            {columns.map((col) => (
              <Column
                key={col.id}
                column={col}
                tasks={getTasksForColumn(col)}
                onTaskClick={(task) => setSelectedTask(task)}
                onAddTask={(colId) => { setAddingIn(colId); setNewTaskTitle(""); }}
                addingIn={addingIn}
                newTaskTitle={newTaskTitle}
                onNewTaskTitleChange={setNewTaskTitle}
                onNewTaskSubmit={handleAddTask}
                onNewTaskCancel={() => { setAddingIn(null); setNewTaskTitle(""); }}
              />
            ))}
          </div>

          <DragOverlay>
            {activeTask && <TaskCard task={activeTask} isOverlay />}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Task detail panel */}
      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          projectId={project._id}
          onClose={() => setSelectedTask(null)}
          onUpdated={handleTaskUpdated}
          onDeleted={handleTaskDeleted}
        />
      )}
    </div>
  );
}
