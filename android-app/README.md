# DSH 启动器 APK

A thin Android WebView shell for the local DSH launcher.

> This is **not** a standalone DSH/Node/proot bundle. The launcher and DSH must
> already be running in Eta/Termux (or another Linux userland) at
> `http://127.0.0.1:3081/`.

## What it does

- Opens `http://127.0.0.1:3081/` in a full-screen WebView.
- Keeps cookies and DOM storage, including the DSH iframe cookie.
- Allows cleartext HTTP only for `127.0.0.1` and `localhost`.
- Handles the Android back button, external links, and file pickers.
- If the launcher is unreachable, shows a native error screen with:
  - **重试**
  - **启动本地服务** — runs `su -c "sh /data/adb/service.d/dsh-launcher.sh"`
    (requires Root/KernelSU and the installed boot hook).

## Identity

| Field | Value |
| --- | --- |
| Package | `com.meow1s.dshlauncher` |
| Version | 1.0.1 (versionCode 2) |
| minSdk | 26 |
| targetSdk | 34 |
| Label | DSH 启动器 |
| Icon | Official DSH whale mark |
| Permissions | INTERNET, ACCESS_NETWORK_STATE |

## Build

Requirements:

- JDK 17+
- Android SDK `android.jar` (compileSdk 29 or newer; API 29 is sufficient
  for the APIs used here)
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
dist/dsh-launcher-1.0.1.apk
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

Release 1.0.1 (official DSH icon):

- APK: `dsh-launcher-1.0.1.apk`
- SHA-256: `b6307ab6c641689f69b0b417b495645ee2b38ddf7d49a182293015f31a777966`
- Signing certificate SHA-256:
  `db871ab22df69e3289bbdc0480510cc5f482cf249aaac82a9d84a5eaf23a92a0`

Release 1.0.0 remains available with the previous icon. The certificate
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
