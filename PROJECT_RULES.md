# SIDENOTES — Project & Architecture Rules

## 1. Product Identity & Vibe
- **App Name**: Sidenotes (Sidenotes: Notes for Noticing)
- **Inspiration**: *footnotes: notes for noticing* (Doppler HQ) meets *Cozy Stash* (Shared journaling / Spaces).
- **Core Loop**: Quick, aesthetic micro-captures of everyday curiosities, thoughts, polaroid pictures, and tactile voice memos organized into independent or shared notebooks ("Spaces").
- **Target Platform**: Sideloadable iOS IPA via AltStore / SideStore / TrollStore & Capacitor 8, plus responsive web.

---

## 2. Iconography & Visual Aesthetics Rule (STRICT)

> [!IMPORTANT]
> **NO NATIVE COLORED SYSTEM EMOJIS IN THE UI CONTROLS**
> Never use native colored system emojis (📊, ⚡, 🗓️, 🎯, 🔔, 🥧, 📸, etc.) as UI icons, tab bar buttons, modal buttons, or toggles.

### Icon Guidelines:
- **Vector Icons Only**: Use vector outline icons from `lucide-react` with `strokeWidth={1.5}` or `strokeWidth={1.75}`.
- **Color Variables**: Inherit `var(--text-primary)`, `var(--text-secondary)`, or `var(--text-tertiary)`.
- **Theme Palette**:
  - **Light Mode**: Warm alabaster linen paper (`#F7F5F0` / `#FCFBF9`), ink black accents (`#1C1917`), subtle warm grey borders.
  - **Dark Mode**: Warm obsidian notebook (`#111113` / `#18181C`), soft white text (`#F5F5F4`), muted warm borders.
- **Typography**:
  - Headers & dates: Typewriter monospaced (`Courier Prime`, `Space Mono`).
  - Body & long reading: Geometric sans (`Urbanist`).

---

## 3. iOS Sideload & Safe Area Invariants (STRICT)

- **Dynamic Island / Hardware Notch**:
  - Never hardcode `top: 24px`.
  - Floating pills and flyouts must compute placement dynamically:
    `style={{ top: "max(calc(env(safe-area-inset-top, 0px) + 14px), 24px)" }}` paired with `left-4 right-4 max-w-md mx-auto`.
- **Home Indicator Inset**:
  - Floating bottom bars and bottom sheet interiors must always clear the home swipe bar:
    `paddingBottom: "max(calc(env(safe-area-inset-bottom, 0px) + 14px), 24px)"`.
- **Touch & Feel**:
  - No touch callout or tap highlight: `-webkit-tap-highlight-color: transparent`.
  - Haptic feedback on all key taps using `@capacitor/haptics`.

---

## 4. Bottom Sheet Architecture (STRICT)
- No artificial height caps (`max-h-[50vh]`) with inner scrollbars.
- Use `BottomSheet` with single scroll container (`min-h-0 flex-1 overflow-y-auto`) expanding up to `92dvh`.
- Virtual keyboard aware via `window.visualViewport`.

---

## 5. Offline-First & Future Supabase Sync
- **Current State**: 100% offline-first local storage.
- **Future Supabase Setup**: When the user provides Supabase credentials, do NOT assume migrations run automatically. Always generate idempotent `.sql` scripts for `spaces`, `field_notes`, and `space_members`.
