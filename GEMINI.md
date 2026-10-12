# Default Behavior (Karpathy Principles)

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding
**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First
**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes
**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution
**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

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
