"use client";

import { SmileIcon } from "lucide-react";
import { lookupEmotionsAction, suggestEmotionsAction } from "@/actions/emotions";
import { useI18n } from "@/i18n/provider";
import { TaggablePicker } from "./TaggablePicker";

interface EmotionComboboxProps {
  name: string;
  defaultValue?: string[];
  initialColors?: Record<string, string>;
  initialEmojis?: Record<string, string>;
  onValueChange?: (emotions: string[]) => void;
}

export function EmotionCombobox({
  name,
  defaultValue,
  initialColors,
  initialEmojis,
  onValueChange,
}: EmotionComboboxProps) {
  const d = useI18n();
  return (
    <TaggablePicker
      name={name}
      defaultValue={defaultValue}
      initialColors={initialColors}
      initialEmojis={initialEmojis}
      onValueChange={onValueChange}
      suggestAction={suggestEmotionsAction}
      lookupAction={lookupEmotionsAction}
      triggerLabel={d.entry.pickers.addEmotion}
      TriggerIcon={SmileIcon}
      emptyMessage={d.entry.pickers.noEmotions}
      sortable
    />
  );
}
