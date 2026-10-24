param([switch]$DebugBuild)
$ErrorActionPreference = 'Stop'
$frontend = Split-Path $PSScriptRoot -Parent
$root = Split-Path $frontend -Parent
$privateDir = Join-Path $root '.local/android-signing'
$outputDir = Join-Path $root '.local/releases'
$previousStore = $env:KAPTAL_KEYSTORE
$previousPassword = $env:KAPTAL_KEY_PASSWORD
Push-Location $frontend
try {
    if (-not $env:ANDROID_HOME) { $env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA 'Android/Sdk' }
    if (-not (Test-Path -LiteralPath $env:ANDROID_HOME)) { throw 'No se encontro Android SDK.' }
    npm run build
    if ($LASTEXITCODE) { throw 'Fallo el build web.' }
    npx cap sync android
    if ($LASTEXITCODE) { throw 'Fallo Capacitor sync.' }
    $variant = 'debug'
    if (-not $DebugBuild) {
        New-Item -ItemType Directory -Force -Path $privateDir | Out-Null
        $secretPath = Join-Path $privateDir 'signing.json'
        $env:KAPTAL_KEYSTORE = Join-Path $privateDir 'kaptal-release.jks'
        if (-not (Test-Path -LiteralPath $secretPath)) {
            if (Test-Path -LiteralPath $env:KAPTAL_KEYSTORE) { throw 'Existe una clave sin su archivo signing.json. Restauralo antes de continuar.' }
            $bytes = New-Object byte[] 32
            $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
            try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
            @{ password = [Convert]::ToBase64String($bytes) } | ConvertTo-Json | Set-Content -LiteralPath $secretPath -Encoding UTF8
        }
        $env:KAPTAL_KEY_PASSWORD = (Get-Content -LiteralPath $secretPath -Raw | ConvertFrom-Json).password
        if (-not (Test-Path -LiteralPath $env:KAPTAL_KEYSTORE)) {
            keytool -genkeypair -keystore $env:KAPTAL_KEYSTORE -storepass:env KAPTAL_KEY_PASSWORD -keypass:env KAPTAL_KEY_PASSWORD -alias kaptal -keyalg RSA -keysize 3072 -validity 10000 -dname 'CN=Kaptal, O=Kaptal, C=MX' -noprompt
            if ($LASTEXITCODE) { throw 'No se pudo crear la firma.' }
        }
        $variant = 'release'
    }
    Push-Location android
    try {
        # Windows PowerShell convierte avisos de javac en errores; manda el codigo de salida.
        $previousErrorAction = $ErrorActionPreference
        try {
            $ErrorActionPreference = 'Continue'
            & ./gradlew.bat ":app:assemble$variant" --no-daemon
            $gradleExitCode = $LASTEXITCODE
        } finally { $ErrorActionPreference = $previousErrorAction }
        if ($gradleExitCode) { throw 'Fallo el build Android.' }
    } finally { Pop-Location }
    $apk = Join-Path $frontend "android/app/build/outputs/apk/$variant/app-$variant.apk"
    $apksigner = Get-ChildItem (Join-Path $env:ANDROID_HOME 'build-tools/*/apksigner.bat') | Sort-Object FullName -Descending | Select-Object -First 1
    & $apksigner.FullName verify $apk
    if ($LASTEXITCODE) { throw 'Firma APK invalida.' }
    New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
    $dest = Join-Path $outputDir "kaptal-$variant.apk"
    Copy-Item -LiteralPath $apk -Destination $dest -Force
    Get-FileHash -LiteralPath $dest -Algorithm SHA256
} finally {
    $env:KAPTAL_KEYSTORE = $previousStore
    $env:KAPTAL_KEY_PASSWORD = $previousPassword
    Pop-Location
}
