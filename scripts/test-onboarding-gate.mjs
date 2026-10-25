import { preview } from "vite";
import { chromium } from "playwright";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 4190;
const BASE_URL = `http://localhost:${PORT}`;

let previewServer = null;
let browser = null;

async function run() {
  try {
    console.log("Starting Vite preview server on port 4190...");
    previewServer = await preview({
      preview: { port: PORT, strictPort: true },
      build: { outDir: "dist" },
    });
    console.log(`Preview server active at ${BASE_URL}`);

    browser = await chromium.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const context = await browser.newContext({
      viewport: { width: 430, height: 932 },
    });
    const page = await context.newPage();

    console.log("\n▶ [TEST 1] Launch fresh app without auth/guest mode -> verify OnboardingGate renders");
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");

    // Clear any leftover storage
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Verify OnboardingGate elements are visible
    const getStartedBtn = page.locator("button:has-text('Get Started'), button:has-text('Mulai Menulis')").first();
    await getStartedBtn.waitFor({ state: "visible", timeout: 5000 });
    console.log("  ✔ PASS: OnboardingGate header and CTA rendered");

    const guestBtn = page.locator("button:has-text('Explore as Guest'), button:has-text('Mode Tamu')").first();
    await guestBtn.waitFor({ state: "visible" });
    console.log("  ✔ PASS: Guest Mode button rendered");

    console.log("\n▶ [TEST 2] Open Auth Drawer -> verify Apple, Google, Email, Forgot Password");
    await getStartedBtn.click();
    await page.waitForTimeout(500);

    const appleBtn = page.locator("button:has-text('Apple')").first();
    await appleBtn.waitFor({ state: "visible" });
    console.log("  ✔ PASS: Apple Sign In/Up button present (Apple Guideline 4.8)");

    const googleBtn = page.locator("button:has-text('Google')").first();
    await googleBtn.waitFor({ state: "visible" });
    console.log("  ✔ PASS: Google Sign In/Up button present");

    const emailInput = page.locator("input[type='email']").first();
    await emailInput.waitFor({ state: "visible" });
    console.log("  ✔ PASS: Email input present");

    const passwordInput = page.locator("input[type='password'], input[type='text']").first();
    await passwordInput.waitFor({ state: "visible" });
    console.log("  ✔ PASS: Password input present");

    // Close auth drawer by clicking close button
    const closeBtn = page.locator("button[title='Close']").first();
    await closeBtn.click();
    await page.waitForTimeout(600);

    console.log("\n▶ [TEST 3] Click 'Explore Offline as Guest' -> transition into Bookshelf");
    await guestBtn.click();
    await page.waitForTimeout(1000);

    // Verify BookshelfView is now displayed via Profile Pill
    const profileBtn = page.locator("button[title='Profile']").first();
    await profileBtn.waitFor({ state: "visible", timeout: 8000 });
    console.log("  ✔ PASS: Successfully navigated to BookshelfView in Guest Mode");

    // Verify localStorage has noticed_guest_mode = true
    const isGuest = await page.evaluate(() => localStorage.getItem("noticed_guest_mode"));
    if (isGuest !== "true") throw new Error("Expected noticed_guest_mode to be 'true'");
    console.log("  ✔ PASS: noticed_guest_mode correctly saved in localStorage");

    console.log("\n▶ [TEST 4] Simulate sign out / reset data -> verify immediate return to OnboardingGate");
    await page.evaluate(() => {
      localStorage.removeItem("noticed_guest_mode");
      window.location.reload();
    });
    await page.waitForLoadState("networkidle");

    // Should immediately be back at OnboardingGate
    await getStartedBtn.waitFor({ state: "visible", timeout: 5000 });
    console.log("  ✔ PASS: Clearing guest mode / signing out immediately restores OnboardingGate");

    console.log("\n════════════════════════════════════════════════════════════");
    console.log("✔ ALL ONBOARDING GATE & AUTH TESTS PASSED SUCCESSFULLY!");
    console.log("════════════════════════════════════════════════════════════\n");
  } finally {
    if (browser) await browser.close();
    if (previewServer) {
      await new Promise((resolve) => {
        previewServer.httpServer.close(() => resolve());
      });
    }
  }
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
