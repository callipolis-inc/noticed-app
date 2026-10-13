# Privacy Policy

**Effective Date:** October 13, 2026  
**Last Updated:** October 13, 2026  
**Application:** Noticed (Mobile & Web)  
**Publisher:** Callipolis Inc. ("Noticed", "we", "us", or "our")

---

## 1. Our Privacy Philosophy

At **Noticed**, we believe that personal reflections, journals, field notes, and creative manuscripts are sacred and deeply private. We designed Noticed as an **offline-first, local-sovereign application**:
- Your notes belong to you and reside on your device.
- We do **not** sell, rent, monetize, or broker your personal data.
- We do **not** employ third-party advertising SDKs, tracking pixels, or cross-app surveillance networks.

---

## 2. Information We Collect and Process

### A. Information Stored Locally on Your Device
By default, all your creative data is stored directly on your device using browser `IndexedDB` and local web storage:
- **Manuscripts & Notes**: Text content, titles, companion marginalia (sidenotes/footnotes), text highlights, and paragraph styling.
- **Notebooks & Spaces**: Space names, color palettes, cover styles, foil choices, and font selections.
- **Media Attachments**: Photos, analog darkroom metadata/filters, video clips, and voice memos.
- **Application Preferences**: Theme choice (e.g. Alabaster, Obsidian), font size, haptic feedback toggle, and sort preferences.

### B. Account & Cloud Synchronization Data (Optional)
If you voluntarily choose to enable **Cloud Synchronization** to back up and sync your notes across devices:
- **Authentication Data**: Your email address and securely hashed authentication credentials managed through Supabase.
- **Synchronized Content**: Encrypted copies of your spaces, notes, and media attachments uploaded to our secure cloud database and storage buckets.
- **Profile Details**: Your chosen pen name/author name and avatar photo.

*You may use Noticed indefinitely in offline-first mode without ever creating a cloud account.*

### C. Device Permissions
Noticed requests specific hardware permissions strictly to power intentional features you initiate:
1. **Microphone**:
   - Requested only when you tap to record a Voice Memo or activate Voice Dictation.
   - Audio is recorded locally on your device. When using live dictation, speech recognition is processed through your device's native speech engine (Web Speech API).
   - Audio recordings are never scanned or analyzed for advertising or marketing.
2. **Camera & Photo Library**:
   - Requested only when you take a photo or select an existing image/video to attach to a note.
   - We do not access photos or videos in your library outside of the specific files you choose to import.
3. **Haptic Engine**:
   - Used to generate tactile haptic feedback during interactions (can be turned off anytime in Settings).

---

## 3. How We Use Your Information

We use collected information solely to:
- Provide, maintain, and render your notes, typography, and media formatting.
- Synchronize your manuscripts across your authorized devices when you enable Cloud Sync.
- Allow you to generate complete archive backups (JSON) and exported PDF/Markdown manuscripts.
- Verify your Atelier Pro membership status if you subscribe to premium features.

We **never**:
- Sell your data to data brokers.
- Train public generative AI foundation models on your private notes without explicit consent.
- Serve third-party behavioral advertisements.

---

## 4. Data Storage, Security & Retention

- **Local Storage**: Your data is stored locally in your device's sandboxed browser storage (`IndexedDB` & `localStorage`).
- **Cloud Security**: When cloud synchronization is active, data in transit is encrypted using **TLS 1.3 / HTTPS**, and data at rest is protected with industry-standard encryption (**AES-256**) hosted on Supabase infrastructure.
- **Retention**: Local data remains on your device until you delete notes, clear browser storage, or tap "Reset All Data". Cloud backups remain active until you delete your notes or request account deletion.

---

## 5. Your Rights & Data Sovereignty (GDPR & CCPA Compliant)

Regardless of where you reside, Noticed provides you with complete control over your data:
1. **Right to Access & Portability**: You can export a full, unencrypted JSON backup of all your notes, spaces, and metadata at any time via **Settings > Export Archive**, or print/export individual notebooks as Markdown manuscripts.
2. **Right to Rectification**: You can edit and update any note, space, or author profile directly within the app.
3. **Right to Erasure ("Right to be Forgotten")**: 
   - You can wipe all local data instantly using the **"Reset All Data"** safeguard in Settings.
   - You can permanently delete cloud-stored notes or your cloud account upon request.
4. **Right to Revoke Permissions**: You can disable microphone, camera, or haptic permissions at any time through your device or browser system settings.

---

## 6. Third-Party Service Providers

We strictly limit third-party infrastructure to essential technical service providers:
- **Supabase Inc.** (Cloud Database, Authentication & Storage): Provides our backend cloud sync and file storage infrastructure under strict data protection agreements.
- **Native OS / Browser Web Speech API**: Powers on-device voice dictation using your browser's underlying speech synthesis/recognition framework.

---

## 7. Children's Privacy

Noticed does not knowingly collect or solicit personal data from children under the age of 13. If we discover that a child under 13 has provided personal information to our cloud synchronization service, we will promptly delete it.

---

## 8. Changes to This Privacy Policy

We may update this Privacy Policy from time to time. When significant updates occur, we will update the "Last Updated" date at the top of this policy and notify users via an in-app notice or release notes.

---

## 9. Contact Us

If you have questions, privacy concerns, or data deletion requests, please contact us at:

- **Email**: privacy@noticed.app / support@callipolis.co  
- **Publisher**: Callipolis Inc.  
- **Website**: [noticed.app](https://noticed.app)
