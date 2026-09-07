@echo off
setlocal
cd /d "%~dp0"

if exist "%ProgramFiles%\Android\Android Studio\jbr\bin\java.exe" (
  set "JAVA_HOME=%ProgramFiles%\Android\Android Studio\jbr"
  set "PATH=%ProgramFiles%\Android\Android Studio\jbr\bin;%PATH%"
)

echo === Java ===
java -version
if errorlevel 1 exit /b 1

echo.
echo === Installing exact dependencies ===
call npm ci
if errorlevel 1 exit /b 1

echo.
echo === Clean Expo prebuild ===
call npx expo prebuild --platform android --clean
if errorlevel 1 exit /b 1

echo.
echo === Building arm64 debug APK with full error output ===
cd android
call gradlew.bat app:assembleDebug -x lint -x test -PreactNativeArchitectures=arm64-v8a --stacktrace
if errorlevel 1 (
  echo.
  echo BUILD FAILED. The actual Gradle cause is above this line.
  exit /b 1
)

echo.
echo BUILD SUCCESSFUL
exit /b 0
