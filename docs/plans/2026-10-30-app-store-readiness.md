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

Progress — 31 October 2026:
- Published accurate App Privacy and legal website pages; website main deployed at 81e3c8f.
- Applied migrations 20261030102446 and 20261030103608 manually through the Supabase SQL editor to project ienbkpjldpzaewzewxfz. CLI migration history was not bootstrapped.
- Deployed delete-account with mandatory caller verification and encrypted Apple configuration. Private media now requires authorized signed URLs.
- All 22 targeted Node tests and production disposable-fixture HTTP integration passed, including physical storage deletion and collaborative media copy.
- Reviewer account stored privately outside Git and in App Store Connect. Free base app and global availability configured.
- Final device gate remains: test the new candidate in TestFlight (Apple login/cancel/revoke/deletion, capture/media, collaboration, purchases/restore). Do not reuse the earlier TTS test confirmation.

Final validation — 31 October 2026:
- Candidate build 1.0 (55), tag v1.0.2-ios, source 89ddf55: GitHub Actions run 41103706130 passed archive/export/upload. Apple processing VALID; internal TestFlight IN_BETA_TESTING.
- Owner explicitly reported every requested physical-device test passed for Noticed build55, including Apple cancellation/revocation/deletion, media/sharing, purchases and restore.
- App Store draft a86b0086-4475-416e-868c-99cfa5df282f contains five READY_FOR_REVIEW items: app1.0(55), lifetime, subscription group, monthly, annual. Submit for Review is enabled; submittedDate remains null. No submission performed.
- Free base price verified as0.0; all175regions selected; Mac/Vision distribution disabled pending platform testing. Paid/free agreements and DSA are active.
- Removed misleading100%-local screenshot from version; seven complete screenshots remain. Original archived outside Git.
- Revoked exposed legacy ASC key RFD9S3H8RW with explicit owner approval; X4SX9VQZ44 remains active. CI cleanup f99d2dc requires GitHub Secrets and does not change build55 application code.
- Website legal deployment81e3c8f verified live. Follow-up marketing correction93776f2 deployed successfully from main through Cloudflare Workers; production HTTP200 and browser visual check confirm accurate offline/cloud copy.
