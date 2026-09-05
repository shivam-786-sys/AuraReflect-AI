# AuraReflect - AI Journal & Reflection Companion

A secure, user-authenticated reflective journaling web application powered by **Gemini 3.6 Flash** and **Google Cloud Firestore**. 

AuraReflect provides an empathetic, confidential sanctuary for personal introspection, mood tracking, voice notes, and multimodal reflections—protected by strict owner-bound Firestore security rules, server-side API proxying, and Google Cloud Secret Manager.

---

## Architecture Overview

```text
[ Browser Client ]
       │
       ├─► Firebase Auth (Google Sign-In) ──► Issues JWT Token
       │
       ├─► Cloud Firestore ──► Direct User-Bound Reads/Writes
       │     (Path: /users/{uid}/entries/{entryId}/messages/{messageId})
       │     (Enforced via owner-isolated firestore.rules: request.auth.uid == userId)
       │
       └─► Cloud Run Backend Proxy (Express / Node.js)
             │
             ├─► Secret Manager ──► Retrieves GEMINI_API_KEY
             │
             ├─► Resilient Model Fallback Ladder:
             │     1. gemini-3.6-flash (Primary)
             │     2. gemini-3.1-flash-lite (High-Availability Fallback)
             │     3. gemini-flash-latest (Dynamic Alias)
             │     4. gemini-3.7-flash (Deep Reasoning Fallback)
             │
             └─► Gemini 3.6 Flash Content Generation / Multi-turn Reflection
```

---

## 1. Agentic Threat Model & Countermeasures

| Threat Zone | Identified Attack Vector / Scenario | Implemented Countermeasure |
| :--- | :--- | :--- |
| **Input Surfaces** | Malformed payloads, oversized file uploads, prompt injection via journal reflections. | Top-level deserialization, defensive payload ingestion (`null-safe` destructuring), 25MB limits, input validation. |
| **Planning & Reasoning** | Prompt injection attempting to leak system instructions or break persona. | System prompt boundary separating user reflections from execution instructions; treats untrusted input as passive text. |
| **Tool Execution** | Gemini API key extraction or client-side exposure. | Server-only initialization via Secret Manager / `process.env.GEMINI_API_KEY`; no client exposure. |
| **Memory & State** | Cross-user data leakage, reading other users' private journal reflections. | Hardened `firestore.rules` checking `request.auth.uid == userId`; strict zero-crash undefined-stripping. |
| **Inter-System Comm** | Session hijacking, unauthenticated API abuse, or runaway spending. | Per-user daily reflection quota counter, token validation, and graceful fallback handling. |

---

## 2. Prerequisites & Environment Setup

1. **Google Cloud Project**: Ensure billing is enabled for your Google Cloud project.
2. **Google Cloud SDK (`gcloud`)**: Installed and initialized:
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```
3. **Enable Required APIs**:
   ```bash
   gcloud services enable \
     run.googleapis.com \
     secretmanager.googleapis.com \
     firestore.googleapis.com \
     identitytoolkit.googleapis.com
   ```

---

## 3. Secret Management Setup

Store your Gemini API key securely in Google Cloud Secret Manager and grant Cloud Run permissions to read it:

```bash
# 1. Create and populate the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 2. Grant the default Compute Engine service account access
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")

gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 4. Firestore Security Configuration

Ensure Firestore is created in Native Mode and deploy the owner-bound security rules:

### `firestore.rules`
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User data isolation: each user can only read and write their own documents
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      match /entries/{entryId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
        
        match /messages/{messageId} {
          allow read, write: if request.auth != null && request.auth.uid == userId;
        }
      }

      match /{allSubcollections=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

Deploy the rules via Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

---

## 5. Cloud Run Deployment Flow

Build and deploy the application container to Google Cloud Run:

```bash
# Deploy to Google Cloud Run
gcloud run deploy aurareflect-app \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest" \
  --port 3000
```

### Mandatory Campaign Verification Labeling

Apply the mandatory challenge label to register your Cloud Run service for verification:

```bash
gcloud run services update aurareflect-app \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```

---

## 6. Functional Stability & User Walkthrough Test Plan

Every user-facing feature and interaction has been structured into explicit, end-to-end test scenarios:

### Test Case 1: Landing Page & Authentication
- **Step 1.1**: Open the app homepage. Verify the landing view displays brand typography, security guarantees, and dual sign-in actions.
- **Step 1.2 (Google Sign-In)**: Click `Continue with Google`. Complete the popup flow. Verify redirect to the private dashboard with user avatar and name.
- **Step 1.3 (Guest Mode)**: Alternatively, click `Instant Guest Preview`. Verify instant dashboard entry with an isolated guest vault.

### Test Case 2: Guided Starter Prompts & New Reflection
- **Step 2.1**: On the dashboard, review the 6 guided starter prompts (e.g. "The Unprocessed Feeling", "Daily Energy Audit", "Three Sensory Anchors").
- **Step 2.2**: Click any prompt card (or click `New Reflection`).
- **Step 2.3**: Verify the conversation view launches with Aura's welcoming greeting tailored to your chosen prompt.

### Test Case 3: Conversational Co-Reflection with Gemini 3.6 Flash
- **Step 3.1**: Enter a personal reflection or thought in the input field and press Send.
- **Step 3.2**: Verify the typing indicator displays: *"Aura is reflecting on your thoughts with Gemini 3.6 Flash..."*
- **Step 3.3**: Verify Aura returns an empathetic, psychologically grounded response with a gentle follow-up question.
- **Step 3.4**: Send a secondary follow-up response. Verify multi-turn conversational memory is preserved.

### Test Case 4: Multimodal Inputs (Voice Notes & Photos)
- **Step 4.1 (Voice Note)**: Click the microphone icon. Verify microphone permission prompt and active recording timer. Click "Done" and submit.
- **Step 4.2 (Photo Attachment)**: Click the image icon. Attach an image. Verify thumbnail preview. Submit and confirm Gemini acknowledges the visual context.

### Test Case 5: Entry Finalization & AI Metadata Synthesis
- **Step 5.1**: Click `Close & Summarize` in the top right.
- **Step 5.2**: Confirm Gemini auto-extracts:
  - An evocative 3-6 word Title
  - A 2-3 sentence Summary
  - 2-4 Categorical Tags
  - A Mood Score (1-10) with descriptive label (e.g. "Peaceful", "Uplifted", "Contemplative")
  - Actionable Key Takeaways
- **Step 5.3**: Verify celebration confetti fires and entry detail view is rendered.

### Test Case 6: Mood Trend Chart & Analytics
- **Step 6.1**: Return to the dashboard. Verify the `Emotional Resonance Arc` chart displays the mood data point with smooth curve and hover tooltips.
- **Step 6.2**: Verify the average mood score updates dynamically.

### Test Case 7: AI Mindset & Growth Recap
- **Step 7.1**: Click `AI Mindset Recap` in the navbar.
- **Step 7.2**: Select `Weekly Arc` or `Monthly Retrospective` and click `Generate Synthesis`.
- **Step 7.3**: Verify Gemini generates headline, emotional arc summary, dominant themes, celebrated wins, and mindful guidance.

### Test Case 8: Data Export (Markdown & PDF)
- **Step 8.1 (Single Entry)**: In entry detail view, click `Export Markdown`. Verify clean markdown download with summary, mood score, and conversation log.
- **Step 8.2 (Full History)**: On dashboard, click `Export`. Choose `Download Full History (.md)` or `Print or Save to PDF`. Verify proper formatting.

### Test Case 9: GDPR Account & Vault Cascade Deletion
- **Step 9.1**: Click the trash can icon in the navbar (`Delete Account & Vault`).
- **Step 9.2**: Review the warning dialog. Type `DELETE` into the confirmation field.
- **Step 9.3**: Click `Destroy Account & Data`. Verify all entries, messages, and session data are erased, and user is returned to the landing page.
