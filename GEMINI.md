# Default Behavior (Karpathy Principles)

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask

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

# Noticed Architectural & Engineering Invariants (STRICT)

> **Engram Project**: Always pass `project: "noticed"` on all Engram MCP operations (`mem_save`, `mem_context`, `mem_session_summary`).

## 1. Iconography & Visual Aesthetics Rule (STRICT)

- **NO NATIVE COLORED SYSTEM EMOJIS IN THE UI CONTROLS**.
- Vector outline icons from `lucide-react` only (`strokeWidth={1.5}` to `2.25`).
- Strict monochrome editorial theme system (Warm Paper, Daylight, Obsidian, Espresso):
  - Always use native theme variables (`var(--sheet-bg)`, `var(--text-primary)`, `var(--text-secondary)`, `var(--glass-border)`, `inner-pseudo-glass`, `dynamic-island-shell`).
  - Never introduce bright saturated accent colors (e.g. amber, emerald, neon blue badges) that clash with the Penguin Classics literary atmosphere.

## 2. iOS Native (IPA), Safe Area & Haptics (STRICT)

- All top floating flyouts/modals must clear the Dynamic Island:
  `style={{ top: "max(calc(env(safe-area-inset-top, 0px) + 14px), 24px)" }}`.
- Bottom actions and sheets must clear the iOS Home swipe bar:
  `paddingBottom: "max(calc(env(safe-area-inset-bottom, 0px) + 14px), 24px)"`.
- Haptics: Use `triggerHaptic()` and `triggerSuccessHaptic()` from `@/lib/haptics`.

## 3. In-App Purchases & Billing (RevenueCat & StoreKit 2)

- Entitlements: Derived strictly from RevenueCat customer info & Supabase. Guest mode and new accounts never receive automatic Pro.
- Lifetime / Patron tier: Always force `expiresAt = null` and `willRenew = false` in subscription details logic.
- UI Modals Separation:
  - `SubscriptionSuccessModal.tsx`: Displays congratulatory welcome and reviews unlocked privileges (`[✓ Unlocked]`).
  - `ManageSubscriptionModal.tsx`: Displays active plan details, Apple Subscriptions deep link (`itms-apps://apps.apple.com/account/subscriptions`) to cancel auto-renewal, and unified Restore Purchases.
- Settings Sheet: Pro accounts display a single unified row for "Manage Subscription & Restore" (`t.settings.manageSubscriptionUnifiedTitle`).

## 4. Supabase RPC & Account Deletion (Apple Guideline 5.1.1(v))

- Stored procedure `public.delete_user_account()` must compare `owner = v_user_id` (`UUID = UUID`) in `storage.objects` and wrap storage purging in a safe `BEGIN ... EXCEPTION WHEN OTHERS THEN NULL; END;` block.
- Client side account deletion must clear IndexedDB (`clearAtelierDB()`), remove all `noticed_*` and `sidenotes_*` localStorage keys, and log out from RevenueCat (`logoutPurchasesUser()`).

## 5. Network Resilience & Bilingual Engine (i18n)

- Mobile Auth: Use `withRetryTimeout` in `src/lib/supabase.ts` for automated retry against transient IPv6 / cellular connection dropouts.
- All user-facing strings must be localized in `src/lib/i18n.ts` for both Bahasa Indonesia (`id`) and English (`en`).
