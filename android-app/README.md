# DSH Launcher APK

A thin Android WebView shell for the local DSH launcher.

> This is **not** a standalone DSH/Node/proot bundle. The launcher and DSH must
> already be running in Eta/Termux (or another Linux userland) at
> `http://127.0.0.1:3081/`.

## What it does

- Opens `http://127.0.0.1:3081/` in a full-screen WebView.
- Keeps cookies and DOM storage, including the DSH iframe cookie.
- Allows cleartext HTTP only for `127.0.0.1` and `localhost`.
- Handles the Android back button, external links, and file pickers.
- Android 13+ predictive back: while DSH is open a native back callback returns
  through WebView history; at launcher home the callback is released so the
  system/Miuix predictive animation can close the app. DSH close uses a
  scale/rounded transition.
- Task notifications: a foreground service posts an ongoing notification with
  a chronometer and live work process while a turn is running, then a normal
  completion or failure notification. Android 13+ asks for notification
  permission on first launch.
- If the launcher is unreachable, shows a native error screen with:
  - **Retry**
  - **Start local service** — runs `su -c "sh /data/adb/service.d/dsh-launcher.sh"`
    (requires Root/KernelSU and the installed boot hook).

## Identity

| Field | Value |
| --- | --- |
| Package | `com.meow1s.dshlauncher` |
| Version | 1.0.4 (versionCode 5) |
| minSdk | 26 |
| targetSdk | 34 |
| Label | DSH Launcher |
| Icon | Official DSH whale mark |
| Permissions | INTERNET, ACCESS_NETWORK_STATE, POST_NOTIFICATIONS, FOREGROUND_SERVICE, FOREGROUND_SERVICE_DATA_SYNC |

## Build

Requirements:

- JDK 17+
- Android SDK `android.jar` (compileSdk 33 or newer; API 33 is required for
  the `enableOnBackInvokedCallback` manifest attribute)
- Android build-tools `lib/d8.jar`
- `aapt2`, `zip`, `zipalign`, `apksigner`

The build script does not use Gradle. From the repository root:

```sh
ANDROID_JAR=/path/to/android-29/android.jar \
D8_JAR=/path/to/android-15/lib/d8.jar \
KEYSTORE=/path/to/dsh-launcher.keystore \
KS_PASS='...' KEY_PASS='...' \
sh android-app/build.sh
```

Output:

```text
dist/dsh-launcher-1.0.4.apk
```

Create a release key (never commit it):

```sh
keytool -genkeypair -keystore dsh-launcher.keystore -storetype PKCS12 \
  -alias dshlauncher -keyalg RSA -keysize 4096 -validity 10000 \
  -dname "CN=DSH Launcher, O=Meow1s, C=CN"
```

For future APK updates, use the **same** keystore; Android will reject an
update signed with a different key.

## Release

The signed APK is uploaded to:

https://github.com/Meow1s/DeepSeek-Harness-For-Android/releases

Release 1.0.4 (settings back + icon):

- APK: `dsh-launcher-1.0.4.apk`
- SHA-256: `0545c8640eb0a85a461808ee980af4f44f10f0185edb9a80ead09e0bd6830d37`
- Signing certificate SHA-256:
  `db871ab22df69e3289bbdc0480510cc5f482cf249aaac82a9d84a5eaf23a92a0`

Release 1.0.3 (task notifications), 1.0.2 (homepage + Miuix back), 1.0.1 (official icon) and 1.0.0 remain available. The certificate
fingerprint is recorded in each release note.

## Limitations

- It needs the local launcher service; it is not an offline APK.
- The root-only start button assumes the boot hook path
  `/data/adb/service.d/dsh-launcher.sh`.
- The APK opens the launcher that is currently served by the Node process;
  mobile UI and built-in plugins come from the DSH profile, not from the APK
  itself.
- The signing key is kept outside the repository. Lose it and future APK
  updates cannot be installed over the old app.
