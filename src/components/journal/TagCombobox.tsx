"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { XIcon, PlusIcon, TagIcon } from "lucide-react";
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
import { suggestTagsAction } from "@/actions/tags";
import { cn } from "@/lib/utils";

type TagSuggestion = { id: string; name: string; display_name: string };

interface TagComboboxProps {
  name: string;
  defaultValue?: string[];
}

export function TagCombobox({ name, defaultValue = [] }: TagComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>(defaultValue);
  const [suggestions, setSuggestions] = useState<TagSuggestion[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    suggestTagsAction("").then(setSuggestions);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const results = await suggestTagsAction(search);
      setSuggestions(results);
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const toggleTag = useCallback((displayName: string) => {
    setSelected((prev) =>
      prev.includes(displayName)
        ? prev.filter((t) => t !== displayName)
        : [...prev, displayName]
    );
  }, []);

  const removeTag = useCallback(
    (e: React.MouseEvent, displayName: string) => {
      e.preventDefault();
      e.stopPropagation();
      setSelected((prev) => prev.filter((t) => t !== displayName));
    },
    []
  );

  const trimmed = search.trim();
  const hasExactMatch = suggestions.some(
    (s) => s.display_name.toLowerCase() === trimmed.toLowerCase()
  );

  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name={name} value={JSON.stringify(selected)} />

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-0.5 rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
            >
              {tag}
              <button
                type="button"
                onClick={(e) => removeTag(e, tag)}
                className="ml-0.5 rounded-sm opacity-60 hover:opacity-100 transition-opacity"
                aria-label={`Remove tag ${tag}`}
              >
                <XIcon className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          type="button"
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            "w-fit"
          )}
        >
          <TagIcon className="size-3.5" />
          Add tag
        </PopoverTrigger>
        <PopoverContent className="w-56 p-0" align="start" side="bottom">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search or create…"
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              {suggestions.length === 0 && !trimmed && (
                <CommandEmpty>No tags yet.</CommandEmpty>
              )}
              {trimmed && !hasExactMatch && suggestions.length === 0 && (
                <CommandEmpty>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 text-sm"
                    onClick={() => {
                      toggleTag(trimmed);
                      setSearch("");
                      setOpen(false);
                    }}
                  >
                    <PlusIcon className="size-3.5" />
                    Create &quot;{trimmed}&quot;
                  </button>
                </CommandEmpty>
              )}
              {suggestions.length > 0 && (
                <CommandGroup>
                  {suggestions.map((tag) => (
                    <CommandItem
                      key={tag.id}
                      value={tag.display_name}
                      onSelect={() => {
                        toggleTag(tag.display_name);
                        setSearch("");
                      }}
                      data-checked={selected.includes(tag.display_name)}
                    >
                      {tag.display_name}
                    </CommandItem>
                  ))}
                  {trimmed && !hasExactMatch && (
                    <CommandItem
                      value={`__create__${trimmed}`}
                      onSelect={() => {
                        toggleTag(trimmed);
                        setSearch("");
                        setOpen(false);
                      }}
                    >
                      <PlusIcon className="size-3.5" />
                      Create &quot;{trimmed}&quot;
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
