# Firebase/GCP Hosting Notes

Recommended company-friendly direction:

- Host the React build with Firebase Hosting in a company-owned Firebase/GCP project.
- Keep Firestore and Storage in the same project when possible.
- Move `netlify/functions/analyze.js` and `netlify/functions/check-frame.js` to Cloud Functions or Cloud Run before removing Netlify.
- Keep the public HTTP API paths as `/api/analyze` and `/api/check-frame` when moving to Cloud Functions or Cloud Run. The React app already tries those paths first.

Suggested hosting setup:

- Build command: `npm run build`
- Output directory: `build`
- SPA fallback: rewrite all non-file routes to `/index.html`

The public magazine is now rendered by React at `/`, and the admin console remains available at `/admin` and `/admin.html`.

Storage rules:

- `storage.rules` keeps public banner reads working while limiting uploads to signed-in users listed in `admin_users/{email}`.
- Deploy the Storage rules with `firebase deploy --only storage --project magazine-13f81`.
