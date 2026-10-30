# Noticed App Store readiness — 30 October 2026

Goal: prepare an accurate, tested App Store draft for owner submission; do not submit to Apple.

Scope: Noticed-Mobile and, with explicit owner approval, Noticed-Website. Owner selected global distribution and confirmed rights/licenses for bundled content and store assets. Preserve bilingual copy and existing theme tokens; do not redesign the UI.

Initial findings:
- App Store version 1.0 selects build 24 while build 53 is VALID and CI #53 succeeded at commit 6aa5245.
- No review draft, no reviewer credentials, App Privacy questionnaire not started, content rights declaration empty, availability not configured.
- Three store products are READY_TO_SUBMIT; screenshot set contains eight complete iPhone 6.7-inch images. Verify their current accuracy and purchase review images.
- Store listing incorrectly claims end-to-end encrypted cloud storage; app sync sends note fields directly to Supabase.
- In-app deletion uses a finally block to sign out even on server failure. Local cleanup is incomplete by prefix. Apple revocation and physical Storage API cleanup need inspection.
- Media uploader returns public URLs; inspect actual bucket visibility/RLS before changing behavior. Never claim media is private without verification.
- Plugin/CLI do not currently expose this project, but browser dashboard access is verified for project ienbkpjldpzaewzewxfz. Use the dashboard while connector access is repaired.

Execution and verification:
1. Audit live schema, storage visibility and access controls, auth/deletion, sharing boundaries, purchases, privacy disclosures and listing assets. Use read-only inspection first; no real user content in logs.
2. Correct factual claims and public legal pages. Verify published URLs and platform privacy declarations against code. Remove unsupported promises rather than inventing encryption or retention guarantees.
3. Fix confirmed account deletion defects with tests first: no local success or forced logout before server confirmation; correct user identity; Apple revocation on native iOS; Storage API cleanup before deleting identity. Preserve repository SQL conventions while using the Storage API for physical files.
4. If live media privacy contradicts the private-notebook product, fix the smallest complete client/server access path and test owner/member/outsider behavior. Record all schema changes in idempotent migrations.
5. Prepare reviewer access and notes; complete age/content-rights/global availability; include existing IAP/subscriptions. Do not repeat TTS app-specific settings blindly.
6. Run targeted tests and npm run build. Review the patch, push an authorized candidate/tag, monitor iOS CI and Apple processing. Owner tests the candidate on iPhone: guest, Apple/email sign-in, capture/attachments, sync/collaboration, all purchases/restore, and deletion/revocation.
7. Run Add for Review and verify selected build, all draft items ready, Submit for Review enabled, and submittedDate null. Save proof and hand off the final button to the owner.

Security-sensitive prerequisites: ask at action time before creating new Apple signing credentials or transmitting private keys to backend secrets. Do not print or commit .env files, signing keys, auth tokens, or reviewer passwords. Legal agreements require their own informed action-time confirmation.
