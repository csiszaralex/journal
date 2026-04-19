import { createEntry } from "../src/db/queries/entries";
import { getOrCreateTag } from "../src/db/queries/tags";
import { format, subDays } from "date-fns";

function today() {
  return format(new Date(), "yyyy-MM-dd");
}

function daysAgo(n: number) {
  return format(subDays(new Date(), n), "yyyy-MM-dd");
}

// Create tags
const calmTag = getOrCreateTag("calm");
const gratefulTag = getOrCreateTag("grateful");
const anxiousTag = getOrCreateTag("anxious");
const focusedTag = getOrCreateTag("focused");
const tiredTag = getOrCreateTag("tired");

// Entry 1: today
const entry1 = createEntry({
  entry_date: today(),
  text: "Had a really productive morning. Finished the project setup and everything is coming together nicely. Looking forward to building out the features.\n\nTook a short walk in the afternoon — helped clear my head.",
  mood_score: 4,
  energy_score: 4,
  tag_ids: [calmTag.id, gratefulTag.id, focusedTag.id],
});
console.log("Created entry 1:", entry1.id, "date:", entry1.version.entry_date);

// Entry 2: 2 days ago
const entry2 = createEntry({
  entry_date: daysAgo(2),
  text: "Bit of a rough day. Too many meetings, not enough deep work. Felt scattered most of the afternoon.\n\nGot a good workout in the evening which helped.",
  mood_score: 3,
  energy_score: 2,
  tag_ids: [anxiousTag.id, tiredTag.id],
});
console.log("Created entry 2:", entry2.id, "date:", entry2.version.entry_date);

// Entry 3: 5 days ago — backdated, no mood
const entry3 = createEntry({
  entry_date: daysAgo(5),
  text: "Spent the day reading. Finished a great book on systems thinking. No screens in the evening — genuinely relaxing.",
  tag_ids: [calmTag.id, gratefulTag.id],
});
console.log("Created entry 3:", entry3.id, "date:", entry3.version.entry_date);

console.log("\nSeed complete. 3 entries, 5 tags created.");
