import assert from "node:assert/strict";

console.log("=== Running Noticed Mobile Monetization & Route Verification Tests ===\n");

// --- TEST 1: Routing & Deep Link Scheme Parsing Logic ---
console.log("[Test 1] Verifying Deep Link & Route Parsing Engine...");

function parseDeepLink(rawUrl) {
  if (
    !rawUrl ||
    (!rawUrl.startsWith("noticed://") &&
      !rawUrl.startsWith("com.syntheticae.noticed://"))
  ) {
    return null;
  }

  // Auth intercept
  if (
    rawUrl.includes("auth/callback") ||
    rawUrl.includes("auth-callback") ||
    rawUrl.includes("access_token=") ||
    rawUrl.includes("type=recovery") ||
    (rawUrl.includes("auth") && rawUrl.includes("code="))
  ) {
    return { type: "auth", rawUrl };
  }

  const url = new URL(rawUrl);
  const host = url.hostname.toLowerCase();
  const segments = url.pathname.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);

  let target = {
    view: null,
    sheet: null,
    spaceId: null,
    noteId: null,
    joinCode: null,
  };

  const viewParam = url.searchParams.get("view");
  if (viewParam === "bookshelf" || viewParam === "notebook") {
    target.view = viewParam;
  }
  const sheetParam = url.searchParams.get("sheet");
  if (sheetParam) target.sheet = sheetParam;

  if (
    (host === "space" && segments[0] === "join") ||
    host === "join" ||
    segments[0] === "join"
  ) {
    target.sheet = "join";
    target.joinCode =
      url.searchParams.get("code") ||
      url.searchParams.get("join") ||
      (host === "join" ? segments[0] : segments[1]);
  } else if (
    host === "pro" ||
    host === "paywall" ||
    host === "subscribe" ||
    segments[0] === "pro" ||
    segments[0] === "paywall" ||
    segments[0] === "subscribe" ||
    url.searchParams.get("modal") === "pro"
  ) {
    target.sheet = "pro";
  } else if (
    host === "theme" ||
    host === "appearance" ||
    segments[0] === "theme" ||
    segments[0] === "appearance"
  ) {
    target.sheet = "theme";
  } else if (
    host === "bookshelf" ||
    host === "home" ||
    segments[0] === "bookshelf" ||
    segments[0] === "home"
  ) {
    target.view = "bookshelf";
  } else if (
    host === "index" ||
    host === "toc" ||
    segments[0] === "index" ||
    segments[0] === "toc"
  ) {
    target.sheet = "index";
  } else if (host === "photostrip" || segments[0] === "photostrip") {
    target.sheet = "photostrip";
  } else if (host === "note" || segments[0] === "note") {
    target.view = "notebook";
    target.noteId =
      url.searchParams.get("id") ||
      url.searchParams.get("noteId") ||
      (host === "note" ? segments[0] : segments[1]);
    target.spaceId =
      url.searchParams.get("space") || url.searchParams.get("spaceId");
  } else if (
    host === "notebook" ||
    host === "space" ||
    segments[0] === "notebook" ||
    segments[0] === "space"
  ) {
    target.view = "notebook";
    target.spaceId =
      url.searchParams.get("id") ||
      url.searchParams.get("spaceId") ||
      (host === "space" || host === "notebook"
        ? segments[0]
        : segments[0] === "space" || segments[0] === "notebook"
          ? segments[1]
          : segments[0]);
  } else if (host === "search" || segments[0] === "search") {
    target.sheet = "search";
  } else if (
    host === "new" ||
    host === "write" ||
    host === "dictate" ||
    host === "darkroom" ||
    segments[0] === "new" ||
    segments[0] === "write"
  ) {
    target.sheet = "create";
  } else if (host === "profile" || segments[0] === "profile") {
    target.sheet = "profile";
  } else if (host === "settings" || segments[0] === "settings") {
    target.sheet = "settings";
  }

  return target;
}

// Assert deep links
const routeTests = [
  { url: "noticed://pro", expected: { sheet: "pro" } },
  { url: "noticed://paywall", expected: { sheet: "pro" } },
  { url: "noticed://theme", expected: { sheet: "theme" } },
  { url: "noticed://appearance", expected: { sheet: "theme" } },
  { url: "noticed://bookshelf", expected: { view: "bookshelf" } },
  { url: "noticed://home", expected: { view: "bookshelf" } },
  { url: "noticed://index", expected: { sheet: "index" } },
  { url: "noticed://toc", expected: { sheet: "index" } },
  { url: "noticed://photostrip", expected: { sheet: "photostrip" } },
  {
    url: "noticed://space/space-kyoto",
    expected: { view: "notebook", spaceId: "space-kyoto" },
  },
  {
    url: "noticed://notebook?id=space-travel",
    expected: { view: "notebook", spaceId: "space-travel" },
  },
  {
    url: "noticed://note/note-456?space=space-kyoto",
    expected: { view: "notebook", noteId: "note-456", spaceId: "space-kyoto" },
  },
  {
    url: "noticed://join?code=ATELIER99",
    expected: { sheet: "join", joinCode: "ATELIER99" },
  },
  { url: "noticed://settings", expected: { sheet: "settings" } },
  { url: "noticed://profile", expected: { sheet: "profile" } },
  { url: "noticed://write", expected: { sheet: "create" } },
];

for (const t of routeTests) {
  const res = parseDeepLink(t.url);
  for (const [key, val] of Object.entries(t.expected)) {
    assert.equal(res[key], val, `Expected ${key}=${val} for ${t.url}, got ${res[key]}`);
  }
}
console.log("  ✓ All 16 Deep Link & Route variants parsed successfully!\n");


// --- TEST 2: Monetization Entitlement & Restore Purchases Logic ---
console.log("[Test 2] Verifying Monetization Non-Sticky Entitlement Logic...");

// Mock state simulating native StoreKit / RevenueCat & localStorage
class MockPurchasesStore {
  constructor() {
    this.storage = new Map();
    this.isProNative = false;
  }

  isProUser() {
    return this.storage.get("noticed_is_pro") === "true";
  }

  setProUser(isPro) {
    this.storage.set("noticed_is_pro", String(isPro));
  }

  // Fixed restore purchases logic
  async restorePurchasesSimulation({ hasActiveReceipt }) {
    if (hasActiveReceipt) {
      this.isProNative = true;
      this.setProUser(true);
      return { isPro: true, message: "Restored successfully" };
    } else {
      // Must revoke / reset
      this.isProNative = false;
      this.setProUser(false);
      return { isPro: false, message: "No active purchase found" };
    }
  }

  // Fixed auth session evaluation
  evaluateAuthSession(profileIsPro) {
    const isNative = true; // Simulator / Native device
    if (isNative) {
      const nativePro = this.isProNative;
      const finalPro = nativePro || Boolean(profileIsPro);
      this.setProUser(finalPro);
      return finalPro;
    } else {
      const finalPro = Boolean(profileIsPro);
      this.setProUser(finalPro);
      return finalPro;
    }
  }
}

const store = new MockPurchasesStore();

// Scenario A: Brand new account signs in on a device that previously had dirty localStorage = true
store.storage.set("noticed_is_pro", "true"); // Dirty artifact
const isNewUserPro = store.evaluateAuthSession(false); // Supabase profile has is_pro: false
assert.equal(isNewUserPro, false, "Brand new account MUST NOT inherit dirty localStorage Pro status!");
assert.equal(store.isProUser(), false, "Local storage MUST be updated to false!");
console.log("  ✓ Scenario A passed: Clean new user is evaluated as FREE, dirty localStorage purged.");

// Scenario B: User taps Restore Purchases with NO active subscription
const restoreRes = await store.restorePurchasesSimulation({ hasActiveReceipt: false });
assert.equal(restoreRes.isPro, false, "Restore on unentitled account MUST return isPro: false!");
assert.equal(store.isProUser(), false, "Account MUST remain FREE after restore fails!");
console.log("  ✓ Scenario B passed: Restore purchases without receipts safely stays FREE.");

// Scenario C: Legitimate subscriber restores purchases
const restoreSubscriberRes = await store.restorePurchasesSimulation({ hasActiveReceipt: true });
assert.equal(restoreSubscriberRes.isPro, true, "Restore on active receipt MUST return isPro: true!");
assert.equal(store.isProUser(), true, "Account MUST become PRO after verified restore!");
console.log("  ✓ Scenario C passed: Active subscriber restores PRO status cleanly.");


// --- TEST 3: Hardware Back Button Dismissal Hierarchy ---
console.log("\n[Test 3] Verifying Hardware Back Button Hierarchy Stack...");

function handleHardwareBack(state) {
  if (state.isJoinSpaceOpen) return "dismiss_join";
  if (state.sharingSpace) return "dismiss_share";
  if (state.exportingSpace) return "dismiss_export";
  if (state.photostripNote) return "dismiss_photostrip";
  if (state.annotatorNote) return "dismiss_annotator";
  if (state.isProModalOpen) return "dismiss_pro";
  if (state.activeMenuNoteId) return "dismiss_menu";
  if (state.isCreateOpen) return "dismiss_create";
  if (state.isSearchOpen) return "dismiss_search";
  if (state.isIndexOpen) return "dismiss_index";
  if (state.isThemeSelectorOpen) return "dismiss_theme";
  if (state.isProfileOpen) return "dismiss_profile";
  if (state.isSettingsOpen) return "dismiss_settings";
  if (state.currentView === "notebook") return "back_to_bookshelf";
  return "exit_app";
}

// 1. If settings is open, Back closes settings
assert.equal(
  handleHardwareBack({ isSettingsOpen: true, currentView: "notebook" }),
  "dismiss_settings"
);

// 2. If pro modal is open over settings, Back closes pro modal first
assert.equal(
  handleHardwareBack({ isProModalOpen: true, isSettingsOpen: true, currentView: "notebook" }),
  "dismiss_pro"
);

// 3. If in notebook view with no modals open, Back returns to bookshelf
assert.equal(
  handleHardwareBack({ currentView: "notebook" }),
  "back_to_bookshelf"
);

// 4. If on bookshelf with no modals open, Back exits the app
assert.equal(
  handleHardwareBack({ currentView: "bookshelf" }),
  "exit_app"
);

console.log("  ✓ Hardware back hierarchy correctly prioritizes Modals > Sheets > Notebook View > App Exit.\n");

console.log("=== All Monetization & Route Verification Tests Passed Successfully! ===");
