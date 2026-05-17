"use client";

import { TagIcon } from "lucide-react";
import { suggestTagsAction } from "@/actions/tags";
import { TaggablePicker } from "./TaggablePicker";

interface TagComboboxProps {
  name: string;
  defaultValue?: string[];
  onValueChange?: (tags: string[]) => void;
}

export function TagCombobox({ name, defaultValue, onValueChange }: TagComboboxProps) {
  return (
    <TaggablePicker
      name={name}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      suggestAction={suggestTagsAction}
      triggerLabel="Add tag"
      TriggerIcon={TagIcon}
      emptyMessage="No tags yet."
    />
  );
}
