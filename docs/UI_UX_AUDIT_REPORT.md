# Comprehensive UI/UX & Frontend QA Audit Report

**Application**: Noticed Mobile (`Noticed-Mobile`)  
**Auditor Role**: Senior Product Designer + UI/UX Auditor + Frontend QA  
**Date**: October 14, 2026  
**Audited Viewports**: Mobile (375 × 667px / 375 × 812px), Tablet (768 × 1024px), Desktop (1440 × 900px)  
**Stack**: React 19.2.8, Tailwind CSS v4.3.3, Framer Motion 13.1.1, Capacitor 8.5.0, Vite 8.3.2  

---

## Executive Summary of Findings

A comprehensive, zero-compromise audit was conducted across all pages, bottom sheets, spatial modals, and interactive micro-interactions of Noticed. A total of **20 concrete issues** were identified, categorized into 4 Critical, 7 High, 6 Medium, and 3 Low severity defects. The application features exceptional typography and aesthetic vision, but suffers from severe edge-case data loss bugs, deceptive deletion copy, sub-44px touch targets violating Apple HIG, missing focus traps, and WCAG AA contrast failures in light themes.

---

## Complete Defect & Audit Log

| # | Page / File:Line | Severity | Issue | Reproduction | Expected | Suggested Fix | Screenshot |
|---|---|---|---|---|---|---|---|
| 1 | `CreateNoteSheet.tsx:423-432` | **Critical** | **Silent Data Loss on Title-Only Notice**: User inputs a title without body text and taps Save; the note is silently discarded without saving. | 1. Open New Notice sheet.<br>2. Type "Meeting with Product Team" in Title.<br>3. Leave body content and media empty.<br>4. Tap "Notice" / Save. | The note should save successfully with the title present, appearing in the stream. | In `handleSave` and `canSave`, include `title.trim().length > 0` as a valid condition to trigger save. | [mobile-375px-create-note.png](audit/mobile-375px-create-note.png) |
| 2 | `CreateNoteSheet.tsx:691-696` | **Critical** | **Accidental Draft Discard on Backdrop Tap**: Tapping outside the modal on mobile immediately unmounts the sheet, permanently destroying typed text and media. | 1. Open New Notice sheet.<br>2. Write a 300-word field note or record audio.<br>3. Accidentally tap the dimmed backdrop outside the card. | An unsaved changes prompt ("Discard draft or continue editing?") should prevent accidental loss. | Add an unsaved changes guard: if `canSave` is true, display a confirmation dialog before invoking `onClose()`. | [tablet-768px-create-note.png](audit/tablet-768px-create-note.png) |
| 3 | `BookshelfView.tsx:1658` & `App.tsx:1002-1004` | **Critical** | **Deceptive Copy Leading to Permanent Data Loss**: Modal copy states "All notes will remain preserved in your archive vault", but code invokes hard deletion across local state and cloud database. | 1. Open Bookshelf view.<br>2. Tap Edit Notebook &gt; Archive Volume.<br>3. Read modal reassuring notes are preserved in archive vault.<br>4. Tap "Archive Volume". | Notes should either move to an actual recoverable Archive Vault table or copy must state "All notes will be permanently deleted". | Either implement a true soft-delete/archived flag in state & cloud, or update dialog copy to warn of permanent deletion. | [mobile-375px-bookshelf.png](audit/mobile-375px-bookshelf.png) |
| 4 | `NoteEntry.tsx:404-414` & `App.tsx:1030` | **Critical** | **Instant Note Deletion Without Confirmation or Undo**: Tapping "Delete Notice" in context menu deletes note immediately with zero confirmation prompt and no undo toast. | 1. In Notebook stream, tap "..." on any note.<br>2. Tap "Delete Notice".<br>3. Note disappears immediately from UI and sync queue. | A confirmation dialog or a toast with a 5-second "Undo" button should allow instant reversal. | Pass an `{ label: "Undo", onClick: restoreNote }` action to `showFlyout` or render a confirmation modal. | [mobile-375px-notebook.png](audit/mobile-375px-notebook.png) |
| 5 | `App.tsx:1439-1462` | **High** | **Scroll Under-Padding Obscures Stream Footer**: Bottom stream container has only `pb-4`, causing the last note and footer colophon to be permanently hidden behind the floating bottom dock. | 1. Open any notebook with 3+ notes.<br>2. Scroll to the very bottom of the page.<br>3. Observe the last note entry and colophon. | Full note content, footnote numbers, and colophon should sit comfortably above the floating dock. | Increase padding-bottom on the scroll container from `pb-4` to `pb-32` (`paddingBottom: calc(env(safe-area-inset-bottom, 0px) + 96px)`). | [mobile-375px-notebook.png](audit/mobile-375px-notebook.png) |
| 6 | `BookshelfView.tsx:431-542` | **High** | **375px Mobile Header Pod Overflow**: On iPhone SE / 375px screens, the Profile Pill and Right Actions Pod exceed available width (335px), compressing icons and clipping margins. | 1. Set viewport to 375px width (iPhone SE).<br>2. Log in with a standard name (e.g. "Good morning, Alexander").<br>3. Inspect the header bar. | Header items should wrap, scale down, or truncate gracefully without colliding or overflowing. | Set `max-w-[120px]` on mobile username greeting and reduce pod horizontal gap/padding on small viewports. | [mobile-375px-bookshelf.png](audit/mobile-375px-bookshelf.png) |
| 7 | `NoteEntry.tsx:146-174` | **High** | **Inline Float Collision & Awkward Line Wrapping**: The `float-right ml-3` inline quote and more controls create awkward gaps or drop to blank lines when text ends near the right margin. | 1. Write a note where the last sentence ends 20px before the right edge.<br>2. View note in stream.<br>3. Observe the floating button cluster. | Action triggers should align to an unobtrusive fixed row or bottom-right corner without disrupting paragraph typography. | Move note actions to a subtle footer row or hover/tap overlay rather than inline CSS `float-right`. | [tablet-768px-notebook.png](audit/tablet-768px-notebook.png) |
| 8 | `src/index.css:272-275` | **High** | **WCAG AA Contrast Failure in Light Themes**: In `alabaster` and `sage` themes, `--text-tertiary` (`#a8a29e`) on `#f7f5f0` paper yields a 2.33:1 contrast ratio, failing the 4.5:1 WCAG minimum. | 1. Select "Alabaster" or "Sage" theme in Settings.<br>2. Inspect timestamps, footnote labels, and form captions.<br>3. Measure contrast with Color Contrast Analyzer. | All body text, dates, and form labels must achieve at least 4.5:1 contrast against their background. | Darken `--text-tertiary` in light themes from `#a8a29e` to `#6b655f` (contrast ratio &gt;= 4.6:1). | [mobile-375px-profile-vault.png](audit/mobile-375px-profile-vault.png) |
| 9 | `NoteEntry.tsx:162, 174, 440` & `BookshelfView.tsx:487, 522` | **High** | **Touch Targets Violating Apple HIG (&lt;44px)**: Buttons for quote annotator (24px), more menu (24px), footnotes (20px), and layout switcher (26px) are too small for touch accuracy. | 1. Open app on a physical mobile device.<br>2. Attempt to tap superscript footnote "¹" or the "..." button.<br>3. Notice frequent mis-taps or unintended paragraph selection. | All touch targets on mobile touchscreens must meet the minimum 44 × 44pt (Apple HIG) / 48 × 48dp (Google Material) hitbox. | Add invisible padding / touch target expansion (`min-w-[44px] min-h-[44px]` with flex centering or pseudo-element hit areas). | [mobile-375px-notebook.png](audit/mobile-375px-notebook.png) |
| 10 | `ProfileSheet.tsx:89` & `SettingsSheet.tsx:71` | **High** | **Missing Focus Trap & Escape Key Listener**: Opening bottom sheets does not trap keyboard focus; hitting `Tab` cycles into hidden elements behind the backdrop, and `Escape` does not close sheets. | 1. Press Tab key to navigate app on desktop/tablet.<br>2. Open Settings or Profile sheet.<br>3. Continue pressing Tab or hit Escape key. | Focus should be locked within the open modal and `Escape` must close the top-level active sheet. | Add `useEffect` listening for `Escape` key and implement `focus-trap-react` or custom focus-lock ref cycling. | [desktop-1440px-profile-vault.png](audit/desktop-1440px-profile-vault.png) |
| 11 | `BookshelfView.tsx:431, 548` | **High** | **Desktop 1440px Space Wastage**: On widescreen monitors (1440px), the bookshelf is constrained to `max-w-md` (448px), leaving ~1000px of dead empty space on left and right. | 1. Open Bookshelf view on a 1440px desktop screen.<br>2. Observe the center column.<br>3. Notice 70% of the screen is an empty black/beige void. | On tablet and desktop screens, the bookshelf should expand into an immersive multi-column library grid or wider 3D shelf. | Use responsive max-widths (`max-w-md md:max-w-3xl lg:max-w-5xl`) and adapt carousel radius for wide viewports. | [desktop-1440px-bookshelf.png](audit/desktop-1440px-bookshelf.png) |
| 12 | `CreateNoteHeader.tsx:171` & `CreateNoteSheet.tsx:672` | **Medium** | **Save Button Disabled Without Explanation**: When user inputs a title without body text, the "Notice" button remains disabled (opacity 30%) without tooltip or helper text explaining why. | 1. Open New Notice sheet.<br>2. Type a title.<br>3. Observe disabled "Notice" button.<br>4. Hover or tap disabled button; no explanation provided. | An accessible tooltip or helper text should explain the requirement (or title should enable saving). | Allow title to satisfy `canSave`, and add helper text or aria-disabled state explaining submission requirements. | [mobile-375px-create-note.png](audit/mobile-375px-create-note.png) |
| 13 | `BookshelfView.tsx:1406-1410` | **Medium** | **Unconstrained Notebook Title Input**: The notebook name input lacks `maxLength` and character counter; titles &gt;15 characters break the vertical spine stamping layout. | 1. Tap New Notebook (+).<br>2. Type a long title: "Field Notes & Observations from the Northern Kyoto Mountains".<br>3. Observe LiveSpinePreview and saved book spine. | Titles should enforce a sensible limit (e.g. 24 chars) or dynamically resize font to prevent overflow. | Add `maxLength={24}` on notebook name input and display a subtle character counter ("18/24"). | [tablet-768px-bookshelf.png](audit/tablet-768px-bookshelf.png) |
| 14 | `BookshelfSpine.tsx:402-414` | **Medium** | **Vertical Spine Stamping Text Clipping in Mobile WebKit**: `writingMode: vertical-rl` paired with `truncate` causes erratic text cutoffs across Safari iOS and mobile Chrome. | 1. Create a notebook with title "Summer Reverie".<br>2. Inspect spine on iOS Safari or mobile Chrome.<br>3. Letters clip abruptly or collide with the bottom motif. | Stamped foil text should scale down or truncate cleanly with standard horizontal/vertical SVG text rendering. | Replace CSS `writingMode: vertical-rl` with SVG text orientation or strict character truncation helper. | [mobile-375px-bookshelf.png](audit/mobile-375px-bookshelf.png) |
| 15 | `CreateNoteMediaSection.tsx:292-301` | **Medium** | **Dead-End Audio & Video Error States**: Microphone or video processing errors show raw red text boxes without retry buttons or settings deep-links. | 1. Deny microphone permission in browser/device settings.<br>2. Tap Voice Memo in Create Note sheet.<br>3. Observe static red error text. | Error box should provide an actionable "Retry" button and guidance ("Check microphone permissions in Settings"). | Add a "Retry" CTA and clear permission troubleshooting copy inside the error banner. | [tablet-768px-create-note.png](audit/tablet-768px-create-note.png) |
| 16 | `QuickAnnotatorModal.tsx:277-280` | **Medium** | **Unsaved Sidenote/Citation Discard on Backdrop Tap**: Tapping outside the Quick Annotator modal immediately dismisses without saving or warning about unsaved draft footnotes. | 1. Open Quick Annotator on any note.<br>2. Write a detailed footnote and bibliographic citation.<br>3. Tap outside the modal box. | Sidenote should either auto-save on dismiss or prompt user before discarding. | Implement auto-save on blur/dismiss or prompt user to save draft if inputs have non-empty values. | [tablet-768px-notebook.png](audit/tablet-768px-notebook.png) |
| 17 | `DarkroomModal.tsx:132-136` | **Medium** | **Unsaved Darkroom Adjustments Discarded**: Tapping backdrop in Darkroom modal immediately drops filter selections and frame adjustments without applying. | 1. Add photo in Create Note.<br>2. Open Darkroom modal and select "Tri-X" with custom caption.<br>3. Accidentally tap outside the modal window. | User should be asked if they wish to apply or discard changes, or backdrop tap should trigger apply. | Change backdrop click behavior to either trigger `handleApply()` or verify if dirty state exists before closing. | [desktop-1440px-create-note.png](audit/desktop-1440px-create-note.png) |
| 18 | `App.tsx:1409-1433` | **Low** | **Lack of List Virtualization on Long Streams**: Rendering 150+ notes with images, canvas photostrips, and audio players causes high DOM memory usage and scrolling stutter. | 1. Import or create 100+ notes with images and audio.<br>2. Rapidly fling-scroll down the notebook stream.<br>3. Measure frame rate using Chrome DevTools Performance. | Scrolling should remain locked at 60/120fps with virtualized windowing or lazy image unmounting. | Introduce `@tanstack/react-virtual` or CSS `content-visibility: auto` on non-visible `DateGroupDivider` sections. | [desktop-1440px-notebook.png](audit/desktop-1440px-notebook.png) |
| 19 | `NoteEntry.tsx:430-445` & `CreateNoteMarkdownToolbar.tsx:98` | **Low** | **Missing Accessible ARIA Labels on Icon-Only Buttons**: Footnote triggers, alignment icons, and toolbar buttons lack `aria-label`, leaving screen readers with empty button names. | 1. Enable VoiceOver (macOS/iOS) or NVDA (Windows).<br>2. Tab to the alignment buttons in markdown toolbar.<br>3. Screen reader announces "Button" with no context. | Every icon-only button must announce its purpose (e.g. `aria-label="Align text center"`). | Add explicit `aria-label` attributes to all icon-only buttons across toolbars and footnote links. | [mobile-375px-notebook.png](audit/mobile-375px-notebook.png) |
| 20 | Entire Codebase | **Low** | **Inconsistent Terminology Across UI Copy**: The app mixes terms inconsistently: "Notice" vs "Note", "Space" vs "Volume" vs "Notebook", and "Archive" vs "Delete". | 1. Compare button label in Bookshelf ("Archive Volume") vs toast ("Notebook archived") vs note menu ("Delete Notice"). | Consistent domain vocabulary should be maintained across all screens, toasts, and settings. | Standardize terminology: "Notebook" for collections, "Notice" for entries, and "Delete" for irreversible purges. | [mobile-375px-profile-vault.png](audit/mobile-375px-profile-vault.png) |

---

## Top 5 Highest Impact Fixes

To achieve immediate production readiness and eliminate severe user frustration, the following 5 fixes should be prioritized above all else:

1. **Fix Silent Data Loss on Title-Only Notices (`CreateNoteSheet.tsx:423`)**:
   - *Impact*: Eliminates immediate data loss when users write notes that start with or only contain a title.
   - *Action*: Update `canSave` and `handleSave` conditions to include `title.trim().length > 0`.

2. **Add Unsaved Draft Guards on Modals (`CreateNoteSheet.tsx:691`, `QuickAnnotatorModal.tsx:277`)**:
   - *Impact*: Prevents accidental loss of long-form thoughts, audio recordings, or footnotes caused by inadvertent backdrop taps.
   - *Action*: Check if input state is dirty before executing `onClose()`; show a confirmation dialog or auto-save draft to local storage.

3. **Resolve Deceptive "Archive Volume" Data Destruction (`BookshelfView.tsx:1658`, `App.tsx:992`)**:
   - *Impact*: Restores user trust and prevents catastrophic loss of entire notebooks.
   - *Action*: Clarify copy to "Permanently Delete Volume" or implement a true `isArchived` flag that moves notebooks into an Archive Vault rather than deleting them from SQLite/Supabase.

4. **Provide Undo Capability on Note Deletion (`NoteEntry.tsx:408`, `App.tsx:1030`)**:
   - *Impact*: Protects users from irreversible accidental deletions on touchscreens.
   - *Action*: In `handleDeleteNote`, utilize `showFlyout`'s built-in action parameter to provide a 5-second "Undo" button that restores the removed note.

5. **Fix Bottom Scroll Underflow in Notebook Stream (`App.tsx:1439`)**:
   - *Impact*: Ensures the final notes and footer colophon are fully visible and readable on all mobile devices.
   - *Action*: Increase stream container bottom padding from `pb-4` to `pb-32` (`calc(env(safe-area-inset-bottom, 0px) + 96px)`).

---

## What is GOOD and Should Be Kept

Despite the identified functional and accessibility defects, the application possesses outstanding design and engineering qualities that distinguish it from standard note-taking apps:

1. **Archival & Tactile Aesthetic**:
   - The tactile leather, buckram cloth, and foil letterpress rendering on book spines (`BookshelfSpine.tsx`) creates an emotional, bespoke connection to personal journaling.
   - The micro-fiber noise overlays, French groove hinge joints, and dynamic lighting gradients are rendered with exceptional craft.

2. **Liquid Glass & iOS Dynamic Island Design Language**:
   - The floating tri-control bottom dock (`App.tsx:1465`) and modal islands use specular rims, subtle inner borders, and high-density blurs (`backdrop-blur-[40px] saturate-[190%]`) that feel genuinely native on iOS and modern Android devices.

3. **Marginalia & Sidenote Typography**:
   - The dual-column layout on wide screens pairing main stream text with editorial marginalia (`NoteEntry.tsx:464`) honors classical book typography while offering contemporary digital utility.

4. **Analog Media Processing**:
   - The darkroom filters (Tri-X, Sepia '74, Silver) and polaroid borders with handwritten captions provide a delightful, nostalgic aesthetic that elevates plain photos into memorable keepsakes.

5. **Instant Local-First Performance**:
   - Storage hydration using local IndexedDB/localStorage ensures near-instant boot times without blocking spinners.

---

## Comprehensive QA Testing Checklist

- [x] **Desktop (1440 × 900px) Tested**:
  - Bookshelf view verified (screenshot: `docs/audit/desktop-1440px-bookshelf.png`).
  - Notebook stream verified (screenshot: `docs/audit/desktop-1440px-notebook.png`).
  - Create Note sheet verified (screenshot: `docs/audit/desktop-1440px-create-note.png`).
  - Profile & Vault sheet verified (screenshot: `docs/audit/desktop-1440px-profile-vault.png`).
- [x] **Tablet (768 × 1024px) Tested**:
  - Bookshelf 3D carousel verified (screenshot: `docs/audit/tablet-768px-bookshelf.png`).
  - Notebook stream layout verified (screenshot: `docs/audit/tablet-768px-notebook.png`).
  - Create Note sheet verified (screenshot: `docs/audit/tablet-768px-create-note.png`).
  - Profile & Vault sheet verified (screenshot: `docs/audit/tablet-768px-profile-vault.png`).
- [x] **Mobile (375 × 667px / 375 × 812px) Tested**:
  - Bookshelf header clipping verified (screenshot: `docs/audit/mobile-375px-bookshelf.png`).
  - Bottom dock occlusion verified (screenshot: `docs/audit/mobile-375px-notebook.png`).
  - Create note keyboard offset verified (screenshot: `docs/audit/mobile-375px-create-note.png`).
  - Profile & Account sheet verified (screenshot: `docs/audit/mobile-375px-profile-vault.png`).
- [x] **Keyboard Navigation & Accessibility Tested**:
  - Tab order through main views, bottom sheets, and modal forms inspected.
  - Absence of focus locks and Escape key listeners identified in 5 sheets.
  - WCAG contrast ratios computed across light and dark themes.
- [x] **Empty States Tested**:
  - Empty bookshelf state verified (`BookshelfView.tsx:548`).
  - Empty notebook stream state verified (`App.tsx:1367`).
  - Empty search results state verified (`SpotlightSearchModal.tsx:483`).
- [x] **Error States Tested**:
  - Audio recording permission denied state inspected (`CreateNoteMediaSection.tsx:298`).
  - Video upload failure state inspected (`CreateNoteMediaSection.tsx:292`).
  - Auth error states and offline sync indicators inspected.

---
*Report generated strictly following Senior Product Designer + UI/UX Auditor + Frontend QA guidelines. Per instructions, all findings have been documented and code modifications halted pending review.*
