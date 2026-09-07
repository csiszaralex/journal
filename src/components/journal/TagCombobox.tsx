"use client";

import { TagIcon } from "lucide-react";
import { lookupTagsAction, suggestTagsAction } from "@/actions/tags";
import { useI18n } from "@/i18n/provider";
import { TaggablePicker } from "./TaggablePicker";

interface TagComboboxProps {
  name: string;
  defaultValue?: string[];
  initialColors?: Record<string, string>;
  onValueChange?: (tags: string[]) => void;
}

export function TagCombobox({ name, defaultValue, initialColors, onValueChange }: TagComboboxProps) {
  const d = useI18n();
  return (
    <TaggablePicker
      name={name}
      defaultValue={defaultValue}
      initialColors={initialColors}
      onValueChange={onValueChange}
      suggestAction={suggestTagsAction}
      lookupAction={lookupTagsAction}
      triggerLabel={d.entry.pickers.addTag}
      TriggerIcon={TagIcon}
      emptyMessage={d.entry.pickers.noTags}
    />
  );
}
