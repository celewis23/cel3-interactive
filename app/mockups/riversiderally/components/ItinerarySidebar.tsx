"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Plus, RotateCcw, CheckCircle2 } from "lucide-react";
import type { Destination, RallyState } from "@/lib/riversiderally/types";
import { secondsToHoursMinutes, metersToMiles } from "@/lib/riversiderally/routing";

interface ItinerarySidebarProps {
  state: RallyState;
  onReorder: (destinations: Destination[]) => void;
  onToggleOptional: (id: string) => void;
  onRemove: (id: string) => void;
  onSelect: (id: string) => void;
  onRename: (name: string) => void;
  onRestore: () => void;
  onAddDestination: () => void;
  totalDistanceMeters: number | null;
  totalDurationSeconds: number | null;
  legDurations: number[] | null;
}

function SortableRow({
  dest,
  index,
  visited,
  legSeconds,
  onToggleOptional,
  onRemove,
  onSelect,
}: {
  dest: Destination;
  index: number;
  visited: boolean;
  legSeconds: number | null;
  onToggleOptional: (id: string) => void;
  onRemove: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: dest.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : dest.excluded ? 0.5 : 1 };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-2.5"
    >
      <div className="flex items-center gap-2">
        <button {...attributes} {...listeners} className="cursor-grab text-neutral-500 hover:text-neutral-300">
          <GripVertical size={16} />
        </button>
        <span className="w-5 text-center text-xs text-neutral-500">{index + 1}</span>
        <button
          onClick={() => onSelect(dest.id)}
          className={`flex-1 truncate text-left text-sm ${dest.excluded ? "text-neutral-500 line-through" : "text-white"}`}
        >
          {dest.name}
          {dest.optional && <span className="ml-1.5 text-xs text-amber-400">(optional)</span>}
        </button>
        {visited && <CheckCircle2 size={14} className="shrink-0 text-green-500" />}
        <button onClick={() => onRemove(dest.id)} className="shrink-0 text-neutral-600 hover:text-red-400">
          <Trash2 size={14} />
        </button>
      </div>
      <div className="mt-1 flex items-center justify-between pl-7 text-xs text-neutral-500">
        <span className="capitalize">{dest.role === "shaping" ? "scenic segment" : dest.category.replace("-", " ")}</span>
        <div className="flex items-center gap-2">
          {dest.optional && (
            <button onClick={() => onToggleOptional(dest.id)} className="text-amber-400 hover:underline">
              {dest.excluded ? "include in route" : "remove from route"}
            </button>
          )}
          {legSeconds !== null && !dest.excluded && <span>{secondsToHoursMinutes(legSeconds)} to next</span>}
        </div>
      </div>
    </li>
  );
}

export default function ItinerarySidebar({
  state,
  onReorder,
  onToggleOptional,
  onRemove,
  onSelect,
  onRename,
  onRestore,
  onAddDestination,
  totalDistanceMeters,
  totalDurationSeconds,
  legDurations,
}: ItinerarySidebarProps) {
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(state.eventName);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const activeDestinations = state.destinations.filter((d) => !d.excluded);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = state.destinations.findIndex((d) => d.id === active.id);
    const newIndex = state.destinations.findIndex((d) => d.id === over.id);
    onReorder(arrayMove(state.destinations, oldIndex, newIndex));
  }

  return (
    <aside className="flex h-full w-full flex-col overflow-y-auto border-r border-neutral-800 bg-neutral-950/90 p-3">
      <div className="mb-3">
        {editingName ? (
          <input
            autoFocus
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={() => {
              onRename(nameDraft.trim() || state.eventName);
              setEditingName(false);
            }}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            className="w-full rounded-md bg-neutral-800 px-2 py-1 text-lg font-bold text-white"
          />
        ) : (
          <button onClick={() => setEditingName(true)} className="text-left text-lg font-bold text-white hover:text-amber-400">
            {state.eventName}
          </button>
        )}
        <p className="text-xs text-neutral-500">Richmond • Powhatan • Goochland</p>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 rounded-lg bg-neutral-900 p-2.5 text-center">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-neutral-500">Distance</p>
          <p className="text-sm font-semibold text-white">
            {totalDistanceMeters != null ? `${metersToMiles(totalDistanceMeters).toFixed(1)} mi` : "—"}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-neutral-500">Drive time</p>
          <p className="text-sm font-semibold text-white">
            {totalDurationSeconds != null ? secondsToHoursMinutes(totalDurationSeconds) : "—"}
          </p>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={state.destinations.map((d) => d.id)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-2">
            {state.destinations.map((dest, i) => (
              <SortableRow
                key={dest.id}
                dest={dest}
                index={i}
                visited={!!state.visited[dest.id]}
                legSeconds={legDurations?.[i] ?? null}
                onToggleOptional={onToggleOptional}
                onRemove={onRemove}
                onSelect={onSelect}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <div className="mt-3 flex flex-col gap-2">
        <button
          onClick={onAddDestination}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-neutral-700 py-2 text-sm text-neutral-400 hover:border-amber-500 hover:text-amber-400"
        >
          <Plus size={15} /> Add destination
        </button>
        <button
          onClick={onRestore}
          className="flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs text-neutral-500 hover:text-neutral-300"
        >
          <RotateCcw size={13} /> Restore original route
        </button>
      </div>
      <p className="mt-2 text-[11px] text-neutral-600">
        {activeDestinations.length} active stop{activeDestinations.length === 1 ? "" : "s"}
      </p>
    </aside>
  );
}
