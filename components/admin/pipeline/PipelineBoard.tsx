"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";

type Stage = { id: string; name: string };

type PipelineContact = {
  _id: string;
  _type: string;
  _createdAt: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: string | null;
  notes: string | null;
  owner: string | null;
  stage: string;
  stageEnteredAt: string;
  estimatedValue: number | null;
  stripeCustomerId: string | null;
  closedAt: string | null;
  driveFileUrl: string | null;
  driveFileName: string | null;
  followUpEventId: string | null;
};

function daysInStage(stageEnteredAt: string): number {
  return Math.floor((Date.now() - new Date(stageEnteredAt).getTime()) / 86400000);
}

function ContactCard({
  contact,
  isOverlay,
}: {
  contact: PipelineContact;
  isOverlay?: boolean;
}) {
  const router = useRouter();
  return (
    <div
      onClick={() => !isOverlay && router.push(`/admin/pipeline/contacts/${contact._id}`)}
      className={`rounded-xl border bg-[#0d0d0d] p-3 cursor-grab select-none transition-all ${
        isOverlay
          ? "border-sky-500/40 shadow-lg shadow-black/40 rotate-1 opacity-90"
          : "border-white/8 hover:border-white/20 hover:bg-white/3"
      }`}
    >
      <p className="text-sm font-semibold text-white leading-snug">{contact.name}</p>
      {contact.company && (
        <p className="text-xs text-white/40 mt-0.5 truncate">{contact.company}</p>
      )}
      <div className="flex items-center gap-2 mt-2">
        {contact.estimatedValue != null && (
          <span className="text-xs text-sky-400">${contact.estimatedValue.toLocaleString()}</span>
        )}
        <span className="text-xs text-white/25 ml-auto">{daysInStage(contact.stageEnteredAt)}d</span>
      </div>
    </div>
  );
}

function DraggableCard({ contact }: { contact: PipelineContact }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: contact._id,
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{ opacity: isDragging ? 0 : 1 }}
    >
      <ContactCard contact={contact} />
    </div>
  );
}

function DroppableColumn({
  stage,
  contacts,
}: {
  stage: Stage;
  contacts: PipelineContact[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  const isWon = stage.id === "won";
  const isLost = stage.id === "lost";
  const headerClass = isWon
    ? "text-green-400"
    : isLost
    ? "text-white/30"
    : "text-white/80";

  return (
    <div className="w-72 flex-shrink-0 flex flex-col">
      {/* Column header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${headerClass}`}>{stage.name}</span>
          <span className="text-xs text-white/30 bg-white/5 rounded-full px-2 py-0.5">
            {contacts.length}
          </span>
        </div>
        <Link
          href={`/admin/pipeline/contacts/new?stage=${stage.id}`}
          className="text-white/30 hover:text-white/70 transition-colors text-lg leading-none"
          title="Add contact"
        >
          +
        </Link>
      </div>

      {/* Droppable area */}
      <div
        ref={setNodeRef}
        className={`flex flex-col gap-2 min-h-[60px] flex-1 rounded-xl transition-colors ${
          isOver ? "bg-sky-500/5" : ""
        }`}
      >
        {contacts.map((contact) => (
          <DraggableCard key={contact._id} contact={contact} />
        ))}
      </div>
    </div>
  );
}

export default function PipelineBoard({
  initialContacts,
  stages,
}: {
  initialContacts: PipelineContact[];
  stages: Stage[];
}) {
  const [contacts, setContacts] = useState<PipelineContact[]>(initialContacts);
  const [activeContact, setActiveContact] = useState<PipelineContact | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function getContactsForStage(stageId: string): PipelineContact[] {
    return contacts
      .filter((c) => c.stage === stageId)
      .sort((a, b) => new Date(a.stageEnteredAt).getTime() - new Date(b.stageEnteredAt).getTime());
  }

  function handleDragStart(event: DragStartEvent) {
    const contact = contacts.find((c) => c._id === event.active.id);
    setActiveContact(contact ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveContact(null);

    if (!over) return;

    const contactId = active.id as string;
    const newStageId = over.id as string;

    const contact = contacts.find((c) => c._id === contactId);
    if (!contact || contact.stage === newStageId) return;

    // Optimistic update
    setContacts((prev) =>
      prev.map((c) =>
        c._id === contactId
          ? { ...c, stage: newStageId, stageEnteredAt: new Date().toISOString() }
          : c
      )
    );

    try {
      await fetch(`/api/admin/pipeline/contacts/${contactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStageId }),
      });
    } catch {
      // Revert on failure
      setContacts(initialContacts);
    }
  }

  return (
    <div className="kanban-scroll flex-1 overflow-x-auto px-4 lg:px-8">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-5 pb-8 min-h-[60vh]">
          {stages.map((stage) => (
            <DroppableColumn
              key={stage.id}
              stage={stage}
              contacts={getContactsForStage(stage.id)}
            />
          ))}
        </div>

        <DragOverlay>
          {activeContact && <ContactCard contact={activeContact} isOverlay />}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
