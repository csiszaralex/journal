"use client";

import { TagIcon } from "lucide-react";
import { lookupTagsAction, suggestTagsAction } from "@/actions/tags";
import { TaggablePicker } from "./TaggablePicker";

interface TagComboboxProps {
  name: string;
  defaultValue?: string[];
  initialColors?: Record<string, string>;
  onValueChange?: (tags: string[]) => void;
}

export function TagCombobox({ name, defaultValue, initialColors, onValueChange }: TagComboboxProps) {
  return (
    <TaggablePicker
      name={name}
      defaultValue={defaultValue}
      initialColors={initialColors}
      onValueChange={onValueChange}
      suggestAction={suggestTagsAction}
      lookupAction={lookupTagsAction}
      triggerLabel="Add tag"
      TriggerIcon={TagIcon}
      emptyMessage="No tags yet."
    />
  );
}
