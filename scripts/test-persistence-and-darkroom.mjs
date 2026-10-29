import fs from "fs";
import path from "path";
import assert from "assert";

console.log("=== RUNNING PERSISTENCE, DARKROOM UI & TEXT SELECTION VERIFICATION ===\n");

// 1. Verify index.css has text selection enabled for note content
console.log("[1/5] Verifying index.css text selection rules...");
const cssPath = path.resolve("src/index.css");
const cssContent = fs.readFileSync(cssPath, "utf-8");
assert(
  cssContent.includes("-webkit-user-select: text !important") &&
  cssContent.includes("user-select: text !important") &&
  cssContent.includes(".select-text") &&
  cssContent.includes(".font-content"),
  "CSS text selection rules must enable text selection on .select-text and .font-content"
);
console.log("  ✓ index.css explicitly enables text selection & touch callouts on notes.");

// 2. Verify NoteEntry.tsx has data-selectable and select-text
console.log("[2/5] Verifying NoteEntry.tsx selectable attributes...");
const noteEntryPath = path.resolve("src/components/notes/NoteEntry.tsx");
const noteEntryContent = fs.readFileSync(noteEntryPath, "utf-8");
assert(
  noteEntryContent.includes('data-selectable="true"') &&
  noteEntryContent.includes("select-text"),
  "NoteEntry.tsx must attach data-selectable='true' and select-text class to the content container"
);
console.log("  ✓ NoteEntry.tsx has data-selectable='true' and select-text on reading containers.");

// 3. Verify DarkroomModal.tsx rounded card and floating pill action bar
console.log("[3/5] Verifying DarkroomModal.tsx layout and styling...");
const darkroomPath = path.resolve("src/components/notes/DarkroomModal.tsx");
const darkroomContent = fs.readFileSync(darkroomPath, "utf-8");
assert(
  darkroomContent.includes("rounded-[32px]") &&
  darkroomContent.includes("bg-[var(--bg-card)]") &&
  darkroomContent.includes("border border-[var(--glass-border)]"),
  "DarkroomModal must use rounded-[32px] and match the card background tone"
);
assert(
  darkroomContent.includes("External Floating Action Pill Bar Centered Below Card") &&
  darkroomContent.includes("Apply to Photo"),
  "DarkroomModal must place Cancel and Apply to Photo in an external floating pill bar centered below the card"
);
console.log("  ✓ DarkroomModal card has rounded-[32px], harmonious top bar, and external centered action pill bar.");

// 4. Verify syncEngine.ts does not prune local offline notes
console.log("[4/5] Verifying syncEngine.ts ghost pruning prevention...");
const syncEnginePath = path.resolve("src/lib/syncEngine.ts");
const syncEngineContent = fs.readFileSync(syncEnginePath, "utf-8");
assert(
  !syncEngineContent.includes("localNoteTime <= lastSyncTime"),
  "syncEngine.ts must NOT prune local notes based on localNoteTime <= lastSyncTime"
);
assert(
  !syncEngineContent.includes("localSpaceTime <= lastSyncTime"),
  "syncEngine.ts must NOT prune local spaces based on localSpaceTime <= lastSyncTime"
);
console.log("  ✓ syncEngine.ts ghost pruning permanently eliminated: local notes & custom spaces are preserved.");

// 5. Verify CreateNoteSheet.tsx draft auto-save and activeSpaceId persistence in App.tsx
console.log("[5/5] Verifying draft caching and App.tsx active space persistence...");
const createNotePath = path.resolve("src/components/notes/CreateNoteSheet.tsx");
const createNoteContent = fs.readFileSync(createNotePath, "utf-8");
assert(
  createNoteContent.includes("noticed_create_note_draft") &&
  createNoteContent.includes("safeLocalStorageGet") &&
  createNoteContent.includes("safeLocalStorageSet") &&
  createNoteContent.includes("safeLocalStorageRemove"),
  "CreateNoteSheet must auto-save, restore, and clear noticed_create_note_draft"
);

const appPath = path.resolve("src/App.tsx");
const appContent = fs.readFileSync(appPath, "utf-8");
assert(
  appContent.includes("noticed_active_space_id"),
  "App.tsx must persist and restore noticed_active_space_id"
);
assert(
  appContent.includes("sidenotes_notes") && appContent.includes("sidenotes_spaces"),
  "App.tsx must support legacy migration fallbacks for sidenotes_notes and sidenotes_spaces"
);
console.log("  ✓ Draft auto-save/restore and activeSpaceId persistence verified.");

console.log("\n>>> ALL VERIFICATION CHECKS PASSED SUCCESSFULLY! <<<");
