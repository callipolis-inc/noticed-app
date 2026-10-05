# Default Behavior

## 1. Think Before Coding
- State your assumptions explicitly.
- Minimum code that solves the problem. Nothing speculative.
- Touch only what you must. Clean up only your own mess.

---

# Sidenotes Architectural & Design Rules

## 1. Iconography & Visual Aesthetics Rule (STRICT)
- **NO NATIVE COLORED SYSTEM EMOJIS IN THE UI CONTROLS**.
- Vector outline icons from `lucide-react` only.
- Strict monochrome warm paper luxury theme system.
  - Light mode: Alabaster cream linen `#f7f5f0` with matte ink black `#1c1917`.
  - Dark mode: Warm obsidian `#111113` with muted frosted glass `#18181c`.

## 2. iOS Sideload (IPA) & Safe Area Rule (STRICT)
- All top floating flyouts/modals must clear the Dynamic Island:
  `style={{ top: "max(calc(env(safe-area-inset-top, 0px) + 14px), 24px)" }}`.
- Bottom actions and sheets must clear the iOS Home swipe bar:
  `paddingBottom: "max(calc(env(safe-area-inset-bottom, 0px) + 14px), 24px)"`.
- Haptics: Use `triggerHaptic()` from `@/lib/haptics`.

## 3. Bottom Sheet Sizing (STRICT)
- No nested scrollbars or artificial inner height caps (`max-h-[50vh]`). The sheet expands to `92dvh`.

## 4. Offline-First & Future Supabase
- The app operates offline-first via local storage. When Supabase is introduced, provide idempotent SQL scripts for the user to execute manually in Supabase SQL editor.
