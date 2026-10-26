#!/bin/sh
# Build the DSH launcher APK.
#
# Requirements:
#   - Android SDK platform android.jar (compileSdk 33 or newer)
#   - Android build-tools d8.jar
#   - JDK 17+ (javac, keytool)
#   - aapt2, zip, zipalign, apksigner
#
# Example:
#   ANDROID_JAR=/path/to/android-29/android.jar \
#   D8_JAR=/path/to/android-15/lib/d8.jar \
#   KEYSTORE=/path/to/dsh-launcher.keystore \
#   KS_PASS=... KEY_PASS=... sh android-app/build.sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
APP="$ROOT/android-app"
BUILD="$APP/build"
DIST="$ROOT/dist"
NAME="dsh-launcher-1.0.4.apk"

: "${ANDROID_JAR:?set ANDROID_JAR to the Android SDK android.jar}"
: "${D8_JAR:?set D8_JAR to build-tools/lib/d8.jar}"
: "${KEYSTORE:?set KEYSTORE to the release keystore}"
: "${KS_PASS:?set KS_PASS (keystore password)}"
: "${KEY_PASS:?set KEY_PASS (key password)}"
KEY_ALIAS="${KEY_ALIAS:-dshlauncher}"

for tool in aapt2 zip javac java zipalign apksigner; do
  command -v "$tool" >/dev/null 2>&1 || { echo "缺少工具: $tool" >&2; exit 1; }
done
[ -f "$ANDROID_JAR" ] || { echo "ANDROID_JAR 不存在: $ANDROID_JAR" >&2; exit 1; }
[ -f "$D8_JAR" ] || { echo "D8_JAR 不存在: $D8_JAR" >&2; exit 1; }
[ -f "$KEYSTORE" ] || { echo "KEYSTORE 不存在: $KEYSTORE" >&2; exit 1; }

rm -rf "$BUILD"
mkdir -p "$BUILD/gen" "$BUILD/classes" "$BUILD/dex" "$DIST"

echo "[1/6] 编译资源与 R.java"
aapt2 compile --dir "$APP/res" -o "$BUILD/res.zip"
aapt2 link -o "$BUILD/unsigned.apk" \
  -I "$ANDROID_JAR" \
  --manifest "$APP/AndroidManifest.xml" \
  --java "$BUILD/gen" \
  --min-sdk-version 26 \
  --target-sdk-version 34 \
  "$BUILD/res.zip"

echo "[2/6] 编译 Java"
find "$APP/java" "$BUILD/gen" -name '*.java' > "$BUILD/sources.txt"
javac -encoding UTF-8 -source 8 -target 8 -Xlint:-options \
  -classpath "$ANDROID_JAR" -d "$BUILD/classes" @"$BUILD/sources.txt"

echo "[3/6] dex"
find "$BUILD/classes" -name '*.class' > "$BUILD/classes.txt"
java -cp "$D8_JAR" com.android.tools.r8.D8 --release --min-api 26 \
  --lib "$ANDROID_JAR" --output "$BUILD/dex" $(cat "$BUILD/classes.txt")

echo "[4/6] 打包 APK"
cp "$BUILD/dex/classes.dex" "$BUILD/classes.dex"
( cd "$BUILD" && zip -q -j unsigned.apk classes.dex )

echo "[5/6] 对齐"
zipalign -f 4 "$BUILD/unsigned.apk" "$BUILD/aligned.apk"

echo "[6/6] 签名"
apksigner sign \
  --ks "$KEYSTORE" \
  --ks-key-alias "$KEY_ALIAS" \
  --ks-pass "env:KS_PASS" \
  --key-pass "env:KEY_PASS" \
  --out "$DIST/$NAME" \
  "$BUILD/aligned.apk"

apksigner verify --verbose "$DIST/$NAME"
sha256sum "$DIST/$NAME"
echo "APK: $DIST/$NAME"
