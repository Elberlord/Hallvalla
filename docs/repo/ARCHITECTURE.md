# HallValla deployment architecture

Private repository -> controlled GitHub Actions deployment -> public GitHub Pages artifact.

Only the browser runtime and stable APK cross the publication boundary. Android source, Firebase backend source and internal documentation remain in the private repository.

`web/` is the canonical deployable browser client.
`backend/firebase/` is the canonical Firebase backend source.
`android/` is the canonical Android project source.
`releases/android/` contains the stable distributable APK but never the permanent signing key.

A code change is not public merely because it is committed. It becomes public when the Pages deployment workflow completes successfully.
