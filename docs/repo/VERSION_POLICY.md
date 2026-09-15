# Version policy

- Web/game versions continue sequentially (v134, v135, ...).
- Android `versionCode` must always increase for installable updates.
- Android `applicationId` remains `com.hallvalla.game`.
- Every production Android update must be signed with the same permanent HallValla release key.
- Keep only one APK as the public `downloads/HallValla-Android.apk`; archive named versions under `releases/android/` privately.
- Development branches are private and do not become public until merged/pushed to the deployment branch and deployed.
