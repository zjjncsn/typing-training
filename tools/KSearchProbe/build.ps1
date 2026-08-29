$ErrorActionPreference = 'Stop'

$frameworkDirectory = Join-Path $env:WINDIR 'Microsoft.NET\Framework\v4.0.30319'
$compiler = Join-Path $frameworkDirectory 'csc.exe'
$source = Join-Path $PSScriptRoot 'KSearchProbe.cs'
$outputDirectory = Join-Path $PSScriptRoot 'bin'
$output = Join-Path $outputDirectory 'KSearchProbe.exe'

New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null

& $compiler `
  /nologo `
  /target:exe `
  /platform:x86 `
  /optimize+ `
  /reference:System.Web.Extensions.dll `
  /out:$output `
  $source

if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

Write-Output $output
