"use client";

import { SmileIcon } from "lucide-react";
import { suggestEmotionsAction } from "@/actions/emotions";
import { TaggablePicker } from "./TaggablePicker";

interface EmotionComboboxProps {
  name: string;
  defaultValue?: string[];
  onValueChange?: (emotions: string[]) => void;
}

export function EmotionCombobox({ name, defaultValue, onValueChange }: EmotionComboboxProps) {
  return (
    <TaggablePicker
      name={name}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      suggestAction={suggestEmotionsAction}
      triggerLabel="Add emotion"
      TriggerIcon={SmileIcon}
      emptyMessage="No emotions yet."
    />
  );
}
