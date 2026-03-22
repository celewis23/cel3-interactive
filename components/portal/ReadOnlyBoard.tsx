"use client";
import { useState } from "react";

type Task = {
  _id: string;
  title: string;
  description: string | null;
  columnId: string;
  priority: string | null;
  dueDate: string | null;
  assignee: string | null;
};

type Comment = {
  _id: string;
  taskId: string;
  text: string;
  author: string;
  _createdAt: string;
};

type Column = {
  id: string;
  name: string;
  taskIds: string[];
};

const PRIORITY_BADGE: Record<string, string> = {
  urgent: "text-red-400",
  high: "text-orange-400",
  medium: "text-yellow-400",
  low: "text-white/30",
};

export default function ReadOnlyBoard({
  columns,
  tasks,
  comments,
}: {
  columns: Column[];
  tasks: Task[];
  comments: Comment[];
}) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const tasksByColumn = tasks.reduce<Record<string, Task[]>>((acc, t) => {
    (acc[t.columnId] = acc[t.columnId] || []).push(t);
    return acc;
  }, {});

  const taskComments = selectedTask
    ? comments.filter((c) => c.taskId === selectedTask._id)
    : [];

  return (
    <div className="relative">
      {/* Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => {
          const colTasks = (col.taskIds || [])
            .map((id) => tasks.find((t) => t._id === id))
            .filter((t): t is Task => !!t)
            .concat((tasksByColumn[col.id] || []).filter(
              (t) => !(col.taskIds || []).includes(t._id)
            ));

          return (
            <div key={col.id} className="w-64 flex-shrink-0">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-medium text-white/70">{col.name}</span>
                <span className="text-xs text-white/30 bg-white/5 rounded-full px-2 py-0.5">
                  {colTasks.length}
                </span>
              </div>
              <div className="flex flex-col gap-2 min-h-[40px]">
                {colTasks.map((task) => (
                  <button
                    key={task._id}
                    onClick={() => setSelectedTask(task)}
                    className="w-full text-left rounded-xl border bg-[#0d0d0d] border-white/8 hover:border-white/20 p-3 transition-colors"
                  >
                    <p className="text-sm text-white leading-snug">{task.title}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      {task.priority && PRIORITY_BADGE[task.priority] && (
                        <span className={`text-xs ${PRIORITY_BADGE[task.priority]}`}>
                          {task.priority}
                        </span>
                      )}
                      {task.dueDate && (
                        <span className="text-xs text-white/25 ml-auto">
                          {new Date(task.dueDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task detail panel */}
      {selectedTask && (
        <div className="fixed inset-0 z-40 flex">
          <div
            className="flex-1 bg-black/60"
            onClick={() => setSelectedTask(null)}
          />
          <div className="w-full max-w-md bg-[#111] border-l border-white/8 flex flex-col overflow-y-auto">
            <div className="flex items-start justify-between p-5 border-b border-white/8">
              <h3 className="text-base font-medium text-white leading-snug pr-4">
                {selectedTask.title}
              </h3>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-white/40 hover:text-white transition-colors flex-shrink-0"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 p-5 flex flex-col gap-5">
              {/* Meta */}
              <div className="grid grid-cols-2 gap-3">
                {selectedTask.priority && (
                  <div>
                    <p className="text-xs text-white/40 mb-1">Priority</p>
                    <p className={`text-sm capitalize ${PRIORITY_BADGE[selectedTask.priority] || "text-white"}`}>
                      {selectedTask.priority}
                    </p>
                  </div>
                )}
                {selectedTask.dueDate && (
                  <div>
                    <p className="text-xs text-white/40 mb-1">Due date</p>
                    <p className="text-sm text-white">
                      {new Date(selectedTask.dueDate).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                )}
                {selectedTask.assignee && (
                  <div>
                    <p className="text-xs text-white/40 mb-1">Assigned to</p>
                    <p className="text-sm text-white">{selectedTask.assignee}</p>
                  </div>
                )}
              </div>

              {selectedTask.description && (
                <div>
                  <p className="text-xs text-white/40 mb-1">Description</p>
                  <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">
                    {selectedTask.description}
                  </p>
                </div>
              )}

              {/* Comments */}
              {taskComments.length > 0 && (
                <div>
                  <p className="text-xs text-white/40 mb-3 uppercase tracking-widest">Comments</p>
                  <div className="flex flex-col gap-3">
                    {taskComments.map((c) => (
                      <div key={c._id} className="bg-white/3 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-white/50">{c.author}</span>
                          <span className="text-xs text-white/25">
                            {new Date(c._createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-white/80 leading-relaxed">{c.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
