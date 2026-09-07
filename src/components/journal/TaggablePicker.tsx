"use client";

import { useState, useEffect, useRef, useCallback, type ComponentType } from "react";
import { XIcon, PlusIcon } from "lucide-react";
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
  horizontalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { SortableChip } from "./SortableChip";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { DEFAULT_TAG_COLOR, getContrastTextColor } from "@/lib/color";
import { useI18n } from "@/i18n/provider";

export type TaggableItem = {
  id: string;
  name: string;
  display_name: string;
  color: string;
  emoji?: string | null;
};

interface TaggablePickerProps {
  name: string;
  defaultValue?: string[];
  initialColors?: Record<string, string>;
  initialEmojis?: Record<string, string>;
  onValueChange?: (values: string[]) => void;
  suggestAction: (input: { prefix: string }) => Promise<
    { data?: TaggableItem[]; serverError?: string; validationErrors?: unknown } | undefined
  >;
  lookupAction: (input: { names: string[] }) => Promise<
    { data?: TaggableItem[]; serverError?: string; validationErrors?: unknown } | undefined
  >;
  triggerLabel: string;
  TriggerIcon: ComponentType<{ className?: string }>;
  searchPlaceholder?: string;
  emptyMessage?: string;
  sortable?: boolean;
}


export function TaggablePicker({
  name,
  defaultValue = [],
  initialColors,
  initialEmojis,
  onValueChange,
  suggestAction,
  lookupAction,
  triggerLabel,
  TriggerIcon,
  searchPlaceholder,
  emptyMessage,
  sortable = false,
}: TaggablePickerProps) {
  const d = useI18n();
  // Defaults for the callers that name neither. They cannot be parameter
  // defaults any more: the dictionary is only readable inside the component.
  const searchPlaceholderText = searchPlaceholder ?? d.entry.pickers.searchPlaceholder;
  const emptyMessageText = emptyMessage ?? d.entry.pickers.empty;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>(defaultValue);
  const [suggestions, setSuggestions] = useState<TaggableItem[]>([]);
  const [colorByName, setColorByName] = useState<Record<string, string>>(
    () => initialColors ?? {},
  );
  const [emojiByName, setEmojiByName] = useState<Record<string, string>>(
    () => initialEmojis ?? {},
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resolvedRef = useRef<Set<string>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const mergeMetadata = useCallback((items: TaggableItem[]) => {
    setColorByName((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const it of items) {
        if (next[it.display_name] !== it.color) {
          next[it.display_name] = it.color;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    setEmojiByName((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const it of items) {
        const emoji = it.emoji ?? "";
        if (emoji && next[it.display_name] !== emoji) {
          next[it.display_name] = emoji;
          changed = true;
        } else if (!emoji && next[it.display_name]) {
          delete next[it.display_name];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, []);

  useEffect(() => {
    suggestAction({ prefix: "" }).then((result) => {
      const items = result?.data ?? [];
      setSuggestions(items);
      mergeMetadata(items);
    });
  }, [suggestAction, mergeMetadata]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const result = await suggestAction({ prefix: search });
      const items = result?.data ?? [];
      setSuggestions(items);
      mergeMetadata(items);
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, suggestAction, mergeMetadata]);

  // Resolve colors/emojis for selected items we have no metadata for yet —
  // e.g. a draft restored from localStorage whose items aren't in the popular
  // suggestions. Resolved in a single batched request — Next.js runs server
  // actions sequentially, so one call per item made the non-popular chips color
  // a beat after the popular ones; one call colors them all together.
  // No cancellation guard on purpose: merging is idempotent, and a guard would
  // let StrictMode's mount→unmount→mount cancel the only in-flight fetch (the
  // remount skips re-fetching via resolvedRef), leaving those chips stuck gray.
  useEffect(() => {
    const missing = selected.filter(
      (nm) => !(nm in colorByName) && !resolvedRef.current.has(nm.toLowerCase()),
    );
    if (missing.length === 0) return;
    missing.forEach((nm) => resolvedRef.current.add(nm.toLowerCase()));
    lookupAction({ names: missing }).then((result) => {
      const items = result?.data ?? [];
      if (items.length) mergeMetadata(items);
    });
  }, [selected, colorByName, lookupAction, mergeMetadata]);

  const toggle = useCallback(
    (displayName: string) => {
      const next = selected.includes(displayName)
        ? selected.filter((t) => t !== displayName)
        : [...selected, displayName];
      setSelected(next);
      onValueChange?.(next);
    },
    [selected, onValueChange]
  );

  const removeItem = useCallback(
    (e: React.MouseEvent, displayName: string) => {
      e.preventDefault();
      e.stopPropagation();
      const next = selected.filter((t) => t !== displayName);
      setSelected(next);
      onValueChange?.(next);
    },
    [selected, onValueChange]
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = selected.indexOf(active.id as string);
      const newIndex = selected.indexOf(over.id as string);
      const newOrder = arrayMove(selected, oldIndex, newIndex);
      setSelected(newOrder);
      onValueChange?.(newOrder);
    }
  }

  const trimmed = search.trim();
  const hasExactMatch = suggestions.some(
    (s) => s.display_name.toLowerCase() === trimmed.toLowerCase()
  );
  const showCreate = trimmed.length > 0 && !hasExactMatch;

  const chips = selected.length > 0 && (
    <div className="flex flex-wrap gap-1">
      {selected.map((item) => {
        const bg = colorByName[item] ?? DEFAULT_TAG_COLOR;
        const fg = getContrastTextColor(bg);
        const emoji = emojiByName[item];
        if (sortable) {
          return (
            <SortableChip
              key={item}
              id={item}
              bg={bg}
              fg={fg}
              emoji={emoji}
              onRemove={(e) => removeItem(e, item)}
            />
          );
        }
        return (
          <button
            key={item}
            type="button"
            onClick={(e) => removeItem(e, item)}
            aria-label={d.entry.pickers.remove(item)}
            className="inline-flex cursor-pointer select-none items-center gap-1 rounded-md px-2 py-0.5 text-xs transition-opacity hover:opacity-80"
            style={{ backgroundColor: bg, color: fg }}
          >
            {emoji && <span className="emoji" aria-hidden>{emoji}</span>}
            {item}
            <XIcon className="size-3 opacity-70" aria-hidden />
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name={name} value={JSON.stringify(selected)} />

      {sortable && selected.length > 0 ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={selected} strategy={horizontalListSortingStrategy}>
            {chips}
          </SortableContext>
        </DndContext>
      ) : (
        chips
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          type="button"
          className={cn(
            "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            "w-fit"
          )}
        >
          <TriggerIcon className="size-3.5" />
          {triggerLabel}
        </PopoverTrigger>
        <PopoverContent className="w-56 p-0" align="start" side="bottom">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={searchPlaceholderText}
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              {suggestions.length === 0 && !trimmed && (
                <CommandEmpty>{emptyMessageText}</CommandEmpty>
              )}
              {(suggestions.length > 0 || showCreate) && (
                <CommandGroup>
                  {suggestions.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={item.display_name}
                      onSelect={() => {
                        toggle(item.display_name);
                        setSearch("");
                      }}
                      data-checked={selected.includes(item.display_name)}
                    >
                      <span
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: item.color }}
                        aria-hidden
                      />
                      {item.emoji && <span className="emoji" aria-hidden>{item.emoji}</span>}
                      {item.display_name}
                    </CommandItem>
                  ))}
                  {showCreate && (
                    <CommandItem
                      value={`__create__${trimmed}`}
                      onSelect={() => {
                        toggle(trimmed);
                        setSearch("");
                        setOpen(false);
                      }}
                    >
                      <PlusIcon className="size-3.5" />
                      {d.entry.pickers.create(trimmed)}
                    </CommandItem>
                  )}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
