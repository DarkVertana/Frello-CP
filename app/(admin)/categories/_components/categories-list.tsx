"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import type { Category } from "@/db/schema";
import { Banner } from "@/app/(auth)/_components/banner";
import { PresetIcon } from "@/lib/icons";
import { CategoryModal } from "./category-modal";

type Props = {
  initial: Category[];
  canManage: boolean;
};

export function CategoriesList({ initial, canManage }: Props) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Category | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const ids = useMemo(() => items.map((item) => item.id), [items]);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((c) => c.id === active.id);
    const newIndex = items.findIndex((c) => c.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(items, oldIndex, newIndex);
    const previous = items;
    setItems(reordered); // optimistic
    setError(null);

    const response = await fetch("/api/v1/categories/reorder", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids: reordered.map((c) => c.id) }),
    });

    if (!response.ok) {
      setItems(previous); // rollback
      const body = await response.json().catch(() => null);
      setError(body?.error?.message ?? "Couldn't save the new order.");
      return;
    }
    startTransition(() => router.refresh());
  }

  async function handleDelete(category: Category) {
    if (!window.confirm(`Delete "${category.name}"? This can't be undone.`)) return;
    setDeletingId(category.id);
    setError(null);

    const response = await fetch(`/api/v1/categories/${category.id}`, {
      method: "DELETE",
    });

    setDeletingId(null);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error?.message ?? "Couldn't delete that category.");
      return;
    }
    setItems((current) => current.filter((c) => c.id !== category.id));
    startTransition(() => router.refresh());
  }

  if (items.length === 0) {
    return (
      <>
        <div className="rounded-card border border-dashed border-border bg-card p-10 text-center">
          <h3 className="text-base font-semibold text-foreground">No categories yet</h3>
          <p className="mt-1 text-sm text-muted">
            Create your first category to start organising the shop.
          </p>
          {canManage ? (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="mt-5 inline-flex h-10 items-center rounded-input bg-tint px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-tint/90"
            >
              New category
            </button>
          ) : null}
        </div>

        <CategoryModal open={createOpen} onOpenChange={setCreateOpen} />
      </>
    );
  }

  return (
    <div className="space-y-3">
      {error ? <Banner tone="error">{error}</Banner> : null}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <ul className="space-y-2">
            {items.map((category) => (
              <SortableRow
                key={category.id}
                category={category}
                canManage={canManage}
                deleting={deletingId === category.id}
                onDelete={() => handleDelete(category)}
                onEdit={() => setEditing(category)}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <CategoryModal
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        category={editing ?? undefined}
      />
    </div>
  );
}

function SortableRow({
  category,
  canManage,
  deleting,
  onDelete,
  onEdit,
}: {
  category: Category;
  canManage: boolean;
  deleting: boolean;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } =
    useSortable({ id: category.id, disabled: !canManage });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-card border border-border bg-card p-4 shadow-card transition ${
        isDragging ? "ring-2 ring-tint" : ""
      }`}
    >
      <button
        type="button"
        aria-label="Drag to reorder"
        disabled={!canManage}
        className="text-muted disabled:cursor-not-allowed disabled:opacity-40"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-5" />
      </button>

      <div className="flex size-10 items-center justify-center rounded-input bg-tint-soft text-tint-dark">
        <PresetIcon name={category.icon} className="size-5" aria-hidden="true" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-foreground">{category.name}</div>
        {category.description ? (
          <div className="truncate text-xs text-foreground/70">
            {category.description}
          </div>
        ) : null}
        <div className="truncate text-xs text-muted">
          /{category.slug} · icon: {category.icon}
        </div>
      </div>

      {canManage ? (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Edit ${category.name}`}
            className="flex size-9 items-center justify-center rounded-input text-muted transition hover:bg-tint-soft hover:text-foreground"
          >
            <Pencil className="size-4" />
          </button>
          <button
            type="button"
            aria-label={`Delete ${category.name}`}
            onClick={onDelete}
            disabled={deleting}
            className="flex size-9 items-center justify-center rounded-input text-muted transition hover:bg-danger-soft hover:text-danger disabled:opacity-50"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      ) : null}
    </li>
  );
}
