$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Dist = Join-Path $Root "dist"
if (Test-Path $Dist) { Remove-Item $Dist -Recurse -Force }
New-Item -ItemType Directory -Path (Join-Path $Dist "downloads") -Force | Out-Null
Copy-Item (Join-Path $Root "web\*") $Dist -Recurse -Force
Copy-Item (Join-Path $Root "web\.nojekyll") $Dist -Force
Copy-Item (Join-Path $Root "releases\android\HallValla-Android-v131.apk") (Join-Path $Dist "downloads\HallValla-Android.apk") -Force
Copy-Item (Join-Path $Root "releases\android\latest.json") (Join-Path $Dist "downloads\latest.json") -Force
Copy-Item (Join-Path $Root "releases\android\SHA256SUMS.txt") (Join-Path $Dist "downloads\SHA256SUMS.txt") -Force
Write-Host "Public distribution created at: $Dist"
