param(
  [string]$LegacyRoot,
  [string]$OutputRoot
)

$ErrorActionPreference = 'Stop'

$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
if (-not $LegacyRoot) {
  $LegacyRoot = [IO.Path]::GetFullPath((Join-Path $projectRoot '..\jsdzt2006'))
}
if (-not $OutputRoot) {
  $OutputRoot = Join-Path $projectRoot 'docs\ksearch-dictionaries\raw'
}

$dictionaryRoot = Join-Path $LegacyRoot 'Data\English\T_Word'
$dllPath = Join-Path $LegacyRoot 'KSearch.dll'
$probePath = Join-Path $PSScriptRoot 'bin\KSearchProbe.exe'

& (Join-Path $PSScriptRoot 'build.ps1') | Out-Null

$categoryIds = @{
  Dictionary = 'dictionary'
  General = 'general'
  Professional = 'professional'
}
$manifestEntries = @()
$datFiles = Get-ChildItem -LiteralPath $dictionaryRoot -Filter '*.DAT' -File -Recurse |
  Sort-Object FullName

foreach ($datFile in $datFiles) {
  $categoryName = $datFile.Directory.Name
  $categoryId = $categoryIds[$categoryName]
  if (-not $categoryId) {
    throw "Unknown dictionary category: $categoryName"
  }

  $dictionaryName = [IO.Path]::GetFileNameWithoutExtension($datFile.Name)
  $categoryOutput = Join-Path $OutputRoot $categoryId
  $outputPath = Join-Path $categoryOutput "$dictionaryName.raw.json"
  New-Item -ItemType Directory -Force -Path $categoryOutput | Out-Null

  Write-Output "Exporting $categoryName/$dictionaryName"
  & $probePath $dllPath $datFile.FullName '--all' $outputPath | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "KSearch probe failed for $($datFile.FullName)"
  }

  $export = Get-Content -LiteralPath $outputPath -Raw -Encoding utf8 | ConvertFrom-Json
  if ($export.Error) {
    throw "KSearch returned an error for $($datFile.FullName): $($export.Error)"
  }

  $errorCount = @($export.Results | Where-Object { $_.Error }).Count
  $caseDifferenceCount = @(
    $export.Results | Where-Object { $_.Entry -cne $_.SearchWord }
  ).Count
  $relativeDat = [IO.Path]::GetRelativePath($LegacyRoot, $datFile.FullName).Replace('\', '/')
  $relativeOutput = [IO.Path]::GetRelativePath($projectRoot, $outputPath).Replace('\', '/')

  $manifestEntries += [ordered]@{
    id = "$categoryId/$dictionaryName"
    category = $categoryId
    name = $dictionaryName
    source = $relativeDat
    output = $relativeOutput
    entryCount = @($export.Results).Count
    errorCount = $errorCount
    caseDifferenceCount = $caseDifferenceCount
  }
}

$totalEntryCount = 0
foreach ($entry in $manifestEntries) {
  $totalEntryCount += [int]$entry.entryCount
}

$manifest = [ordered]@{
  schemaVersion = 1
  dictionaryCount = $manifestEntries.Count
  totalEntryCount = $totalEntryCount
  dictionaries = $manifestEntries
}
$manifestPath = Join-Path (Split-Path $OutputRoot -Parent) 'manifest.json'
$manifest | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $manifestPath -Encoding utf8NoBOM

Write-Output "Exported $($manifest.dictionaryCount) dictionaries and $($manifest.totalEntryCount) entries."
Write-Output $manifestPath
