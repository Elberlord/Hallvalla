$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Dist = Join-Path $Root "dist"
if (Test-Path $Dist) { Remove-Item $Dist -Recurse -Force }
New-Item -ItemType Directory -Path (Join-Path $Dist "downloads") -Force | Out-Null
Copy-Item (Join-Path $Root "web\*") $Dist -Recurse -Force
$NoJekyll = Join-Path $Root "web\.nojekyll"
if (Test-Path $NoJekyll) { Copy-Item $NoJekyll $Dist -Force }

$Latest = Join-Path $Root "releases\android\latest.json"
$ApkFile = $null
if (Test-Path $Latest) {
    try {
        $Meta = Get-Content $Latest -Raw | ConvertFrom-Json
        $ApkFile = $Meta.file
    } catch {
        $ApkFile = $null
    }
}

$ApkSource = if ($ApkFile) { Join-Path $Root ("releases\android\" + $ApkFile) } else { $null }
if ($ApkSource -and (Test-Path $ApkSource)) {
    Copy-Item $ApkSource (Join-Path $Dist "downloads\HallValla-Android.apk") -Force
    Copy-Item $Latest (Join-Path $Dist "downloads\latest.json") -Force
    $Sums = Join-Path $Root "releases\android\SHA256SUMS.txt"
    if (Test-Path $Sums) { Copy-Item $Sums (Join-Path $Dist "downloads\SHA256SUMS.txt") -Force }
    Write-Host "Public distribution created with Android APK: $ApkFile"
} else {
    Write-Host "Public distribution created without Android APK (signed APK not present in releases/android)."
}
Write-Host "Public distribution created at: $Dist"
