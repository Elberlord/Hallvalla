param([int]$Port = 8765)

$ErrorActionPreference = "Stop"
$Repo = Split-Path -Parent $PSScriptRoot
$Generated = Join-Path $Repo "web\js\game\content-generated.js"
$Bootstrap = Join-Path $Repo "web\js\bootstrap-loader.js"
$ServiceWorker = Join-Path $Repo "web\service-worker.js"
$AssetsDir = Join-Path $Repo "web\assets\cards\custom\units"
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Read-Utf8([string]$Path){ [IO.File]::ReadAllText($Path,[Text.Encoding]::UTF8) }
function Write-Utf8([string]$Path,[string]$Text){ [IO.File]::WriteAllText($Path,$Text,$Utf8NoBom) }
function Hash12([string]$Path){ (Get-FileHash -Algorithm SHA256 -Path $Path).Hash.ToLowerInvariant().Substring(0,12) }

function To-Hashtable($Value){
  if($null -eq $Value){ return $null }
  if($Value -is [System.Management.Automation.PSCustomObject]){
    $h=@{}
    foreach($p in $Value.PSObject.Properties){ $h[$p.Name]=To-Hashtable $p.Value }
    return $h
  }
  if($Value -is [System.Collections.IDictionary]){
    $h=@{}
    foreach($k in $Value.Keys){ $h[[string]$k]=To-Hashtable $Value[$k] }
    return $h
  }
  if($Value -is [System.Collections.IEnumerable] -and -not ($Value -is [string])){
    return @($Value | ForEach-Object { To-Hashtable $_ })
  }
  return $Value
}

function Get-ContentData(){
  $text=Read-Utf8 $Generated
  $m=[regex]::Match($text,'(?s)/\*__HVC_DATA_START__\*/(.*?)/\*__HVC_DATA_END__\*/')
  if(-not $m.Success){ throw "Generated content markers not found." }
  $raw=$m.Groups[1].Value.Trim()
  return @{ Text=$text; Match=$m; Data=(To-Hashtable ($raw | ConvertFrom-Json)) }
}

function Save-ContentData($Bundle,$Data){
  $json=$Data | ConvertTo-Json -Depth 100
  $replacement="/*__HVC_DATA_START__*/$json/*__HVC_DATA_END__*/"
  $text=$Bundle.Text.Substring(0,$Bundle.Match.Index)+$replacement+$Bundle.Text.Substring($Bundle.Match.Index+$Bundle.Match.Length)
  Write-Utf8 $Generated $text
}

function Ensure-Shape([hashtable]$Data){
  if(-not $Data.ContainsKey("version")){ $Data.version=1 }
  if(-not $Data.ContainsKey("registries") -or -not ($Data.registries -is [hashtable])){ $Data.registries=@{} }
  foreach($kind in @("weapons","classes","races","types")){ if(-not $Data.registries.ContainsKey($kind)){ $Data.registries[$kind]=@() } }
  if(-not $Data.ContainsKey("unitOverrides") -or -not ($Data.unitOverrides -is [hashtable])){ $Data.unitOverrides=@{} }
  if(-not $Data.ContainsKey("units")){ $Data.units=@() }
  if(-not $Data.ContainsKey("skills")){ $Data.skills=@() }
  if(-not $Data.ContainsKey("assignments") -or -not ($Data.assignments -is [hashtable])){ $Data.assignments=@{} }
}

function Replace-Hash([string]$Text,[string]$Key,[string]$Hash){
  $pattern='("' + [regex]::Escape($Key) + '"\s*:\s*")([0-9a-fA-F]{12})(")'
  $m=[regex]::Match($Text,$pattern)
  if(-not $m.Success){ throw "Cache token not found for $Key" }
  return $Text.Substring(0,$m.Index)+$m.Groups[1].Value+$Hash+$m.Groups[3].Value+$Text.Substring($m.Index+$m.Length)
}

function Refresh-CacheTokens(){
  $contentHash=Hash12 $Generated
  $boot=Read-Utf8 $Bootstrap
  $boot=Replace-Hash $boot "game/content-generated.js" $contentHash
  Write-Utf8 $Bootstrap $boot
  $bootHash=Hash12 $Bootstrap

  $sw=Read-Utf8 $ServiceWorker
  $sw=Replace-Hash $sw "js/game/content-generated.js" $contentHash
  $sw=Replace-Hash $sw "js/bootstrap-loader.js" $bootHash
  Write-Utf8 $ServiceWorker $sw
}

function Save-Image([string]$DataUrl,[string]$UnitKey){
  if([string]::IsNullOrWhiteSpace($DataUrl)){ return "" }
  $m=[regex]::Match($DataUrl,'^data:image/([^;]+);base64,(.+)$')
  if(-not $m.Success){ throw "Unsupported image payload." }
  $ext=$m.Groups[1].Value.ToLowerInvariant()
  if($ext -eq "jpeg"){ $ext="jpg" }
  if(@("png","jpg","webp") -notcontains $ext){ throw "Only PNG, JPG and WEBP are supported." }
  New-Item -ItemType Directory -Path $AssetsDir -Force | Out-Null
  $stamp=Get-Date -Format "yyyyMMddHHmmss"
  $name="${UnitKey}_${stamp}.${ext}"
  $full=Join-Path $AssetsDir $name
  [IO.File]::WriteAllBytes($full,[Convert]::FromBase64String($m.Groups[2].Value))
  return "assets/cards/custom/units/$name"
}

function Git-Publish([string]$Message,[string[]]$ExtraPaths=@()){
  Set-Location $Repo
  $paths=@("web/js/game/content-generated.js","web/js/bootstrap-loader.js","web/service-worker.js")+$ExtraPaths
  & git add -- @paths
  if($LASTEXITCODE -ne 0){ throw "git add failed." }
  & git diff --cached --check
  if($LASTEXITCODE -ne 0){ throw "git diff --cached --check failed." }
  $staged=& git diff --cached --name-only
  if(-not $staged){ return @{commit="";message="No changes to publish."} }
  & git commit -m $Message
  if($LASTEXITCODE -ne 0){ throw "git commit failed." }
  $commit=(& git rev-parse --short HEAD).Trim()
  & git push origin main
  if($LASTEXITCODE -ne 0){ throw "git push origin main failed. The commit remains local: $commit" }
  return @{commit=$commit;message="Commit and push completed."}
}

function Json-Response($Context,[int]$Status,$Object){
  $json=$Object | ConvertTo-Json -Depth 20 -Compress
  $bytes=$Utf8NoBom.GetBytes($json)
  $Context.Response.StatusCode=$Status
  $Context.Response.ContentType="application/json; charset=utf-8"
  $Context.Response.Headers["Access-Control-Allow-Origin"]="https://elberlord.github.io"
  $Context.Response.Headers["Access-Control-Allow-Methods"]="GET,POST,OPTIONS"
  $Context.Response.Headers["Access-Control-Allow-Headers"]="Content-Type"
  $Context.Response.OutputStream.Write($bytes,0,$bytes.Length)
  $Context.Response.OutputStream.Close()
}

if(-not (Test-Path $Generated)){ throw "Missing $Generated" }
if(-not (Test-Path $Bootstrap)){ throw "Missing $Bootstrap" }
if(-not (Test-Path $ServiceWorker)){ throw "Missing $ServiceWorker" }

$listener=New-Object System.Net.HttpListener
$prefix="http://127.0.0.1:$Port/"
$listener.Prefixes.Add($prefix)
$listener.Start()

Write-Host ""
Write-Host "HallValla Content Bridge" -ForegroundColor Cyan
Write-Host "Listening on $prefix" -ForegroundColor Green
Write-Host "Repo: $Repo" -ForegroundColor DarkGray
Write-Host "Keep this window open while using HallValla ?dev." -ForegroundColor Yellow
Write-Host "Ctrl+C to stop." -ForegroundColor DarkGray

try{
  while($listener.IsListening){
    $ctx=$listener.GetContext()
    try{
      if($ctx.Request.HttpMethod -eq "OPTIONS"){ Json-Response $ctx 200 @{ok=$true}; continue }
      if($ctx.Request.Url.AbsolutePath -eq "/health"){ Json-Response $ctx 200 @{ok=$true;repo=$Repo}; continue }
      if($ctx.Request.Url.AbsolutePath -ne "/hallvalla/content" -or $ctx.Request.HttpMethod -ne "POST"){ Json-Response $ctx 404 @{ok=$false;error="Not found"}; continue }

      $reader=New-Object IO.StreamReader($ctx.Request.InputStream,[Text.Encoding]::UTF8)
      $raw=$reader.ReadToEnd();$reader.Dispose()
      $payload=To-Hashtable ($raw | ConvertFrom-Json)
      $bundle=Get-ContentData
      $data=$bundle.Data
      Ensure-Shape $data
      $extra=@()

      switch([string]$payload.action){
        "upsertRegistry" {
          $kind=[string]$payload.kind
          if(@("weapons","classes","races","types") -notcontains $kind){ throw "Invalid registry kind." }
          $item=$payload.item
          $id=[string]$item.id
          if([string]::IsNullOrWhiteSpace($id)){ throw "Registry ID is empty." }
          $list=@($data.registries[$kind] | Where-Object { [string]$_.id -ne $id })
          $list+=,$item
          $data.registries[$kind]=$list
        }
        "upsertUnit" {
          $unit=$payload.unit
          $assignment=$payload.assignment
          $existing=[bool]$payload.existing
          $original=[string]$payload.originalKey
          $key=[string]$unit.key
          if([string]::IsNullOrWhiteSpace($key)){ throw "Unit key is empty." }

          $imagePath=Save-Image ([string]$payload.imageData) $key
          if($imagePath){
            $unit.portrait=$imagePath
            $unit.fieldFigure=$imagePath
            $extra+=("web/"+$imagePath)
          }

          if($existing){
            if([string]::IsNullOrWhiteSpace($original)){ $original=$key }
            $patch=@{}
            foreach($k in $unit.Keys){ if($k -ne "key"){ $patch[$k]=$unit[$k] } }
            $data.unitOverrides[$original]=$patch
            $data.assignments[$original]=$assignment
          }else{
            $units=@($data.units | Where-Object { [string]$_.key -ne $key })
            $units+=,$unit
            $data.units=$units
            $data.assignments[$key]=$assignment
          }
        }
        default { throw "Unsupported action: $($payload.action)" }
      }

      Save-ContentData $bundle $data
      Refresh-CacheTokens
      $message=[string]$payload.commitMessage
      if([string]::IsNullOrWhiteSpace($message)){ $message="Content editor update" }
      $published=Git-Publish $message $extra
      Json-Response $ctx 200 @{ok=$true;commit=$published.commit;message=$published.message}
    }catch{
      Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
      Json-Response $ctx 500 @{ok=$false;error=$_.Exception.Message}
    }
  }
}finally{
  $listener.Stop()
  $listener.Close()
}
