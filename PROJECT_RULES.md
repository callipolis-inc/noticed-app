# NOTICED — Project & Architecture Rules

## 1. Product Identity & Vibe
- **App Name**: Noticed (Private Field Notes & Sovereign Atelier)
- **Bundle ID**: `com.syntheticae.noticed`
- **Core Loop**: Quick, aesthetic micro-captures of everyday curiosities, thoughts, polaroid pictures, 30s moving vignettes, and tactile voice memos organized into independent or shared notebooks ("Spaces").
- **Target Platform**: Apple App Store (iOS 16+), TestFlight, sideloadable IPA, and responsive web.

---

## 2. Iconography & Visual Aesthetics Rule (STRICT)

> [!IMPORTANT]
> **NO NATIVE COLORED SYSTEM EMOJIS IN THE UI CONTROLS**
> Never use native colored system emojis (📊, ⚡, 🗓️, 🎯, 🔔, 🥧, 📸, etc.) as UI icons, tab bar buttons, modal buttons, or toggles.

### Icon Guidelines:
- **Vector Icons Only**: Use vector outline icons from `lucide-react` with `strokeWidth={1.5}` to `2.25`.
- **Color Variables**: Strictly inherit native CSS theme tokens:
  - `var(--text-primary)`, `var(--text-secondary)`, `var(--text-tertiary)`, `var(--glass-border)`, `var(--sheet-bg)`.
- **Theme Palette (4 Resolutions)**:
  - **Warm Paper**: Warm alabaster linen paper (`#F7F5F0`), matte ink black (`#1C1917`).
  - **Daylight**: Pure porcelain white (`#FFFFFF`), crisp ink (`#111113`).
  - **Obsidian**: Warm obsidian slate (`#111113`), soft paper white text (`#F5F5F4`).
  - **Espresso**: Deep mahogany roast (`#181412`), warm parchment (`#F4EFEA`).
- **Typography Four-Pillar System**:
  - Long reading & prose: `Newsreader` (Editorial Serif)
  - Display titles & chapter headers: `Cormorant Garamond` (Classic Display)
  - Quick UI & compact forms: `Urbanist` (Geometric Sans)
  - Dates, timestamps, & indices: `Courier Prime` / `Space Mono` (Monospaced)

---

## 3. iOS Native & Safe Area Invariants (STRICT)

- **Dynamic Island / Hardware Notch Clearance**:
  - Never hardcode fixed top offsets (`top: 24px`).
  - Floating pills and flyouts must compute placement dynamically:
    `style={{ top: "max(calc(env(safe-area-inset-top, 0px) + 14px), 24px)" }}` paired with `left-4 right-4 max-w-md mx-auto`.
- **Home Indicator Inset Clearance**:
  - Floating bottom bars and bottom sheet interiors must always clear the home swipe bar:
    `paddingBottom: "max(calc(env(safe-area-inset-bottom, 0px) + 14px), 24px)"`.
- **Touch & Feel**:
  - Touch highlight disabled: `-webkit-tap-highlight-color: transparent`.
  - Haptic feedback on all interactions via `triggerHaptic()` and `triggerSuccessHaptic()`.

---

## 4. Monetization & Billing (RevenueCat & StoreKit 2)

- **SDK**: `@revenuecat/purchases-capacitor` configured with App Store API Key (`X4SX9VQZ44.p8`) and IAP Key (`VV2BGUYC5N.p8`).
- **Product Identifiers**:
  - `noticed_pro_monthly` (Monthly)
  - `noticed_pro_annual` (Annual)
  - `noticed_pro_lifetime` (Patron Lifetime)
- **Lifetime Validity Rule**: Non-subscription transactions (Patron) must explicitly force `expiresAt = null` and `willRenew = false` to prevent displaying a false expiration date.
- **Dedicated Management Modal**: Clicking "Kelola Langganan / Manage Subscription" opens `ManageSubscriptionModal.tsx` which directly routes to `openStoreSubscriptionManagement()` (`itms-apps://apps.apple.com/account/subscriptions`) and provides in-sheet purchase restoration.

---

## 5. Security, Privacy & Account Deletion (Apple Guideline 5.1.1(v))

- **Permanent Account Deletion**:
  - Stored procedure `public.delete_user_account()` in Supabase runs as `security definer`.
  - Must compare `storage.objects.owner = v_user_id` (`UUID = UUID`) with safe exception wrapping on storage purging.
  - Client side purges IndexedDB (`clearAtelierDB()`), clears all `noticed_*` and `sidenotes_*` localStorage keys, and resets RevenueCat identity.
- **Network Resilience**:
  - Auth network calls use `withRetryTimeout` (300ms fallback) to prevent timeout failures on mobile IPv6 routing.
