<#
.SYNOPSIS
    Pornește site-ul RS OPTIMIZATION local, ca să îl vezi înainte să îl urci pe hosting.

.EXAMPLE
    .\preview.ps1              # http://localhost:8080
    .\preview.ps1 -Port 3000
    .\preview.ps1 -Php         # dacă ai PHP instalat: testează și admin panel-ul complet
#>

[CmdletBinding()]
param(
    [int]$Port = 8080,
    [switch]$Php
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Definition
$url = "http://localhost:$Port"

function Have($name) { return [bool](Get-Command $name -ErrorAction SilentlyContinue) }

Write-Host ''
Write-Host '  RS OPTIMIZATION - preview local' -ForegroundColor Cyan
Write-Host "  $url" -ForegroundColor White
Write-Host "  $url/admin.html   (admin panel)" -ForegroundColor White
Write-Host ''
Write-Host '  Oprește cu Ctrl+C' -ForegroundColor DarkGray
Write-Host ''

if ($Php) {
    if (-not (Have php)) {
        throw "PHP nu este instalat. Rulează fără -Php, sau instalează PHP (winget install PHP.PHP.8.3)."
    }
    Write-Host '  Server PHP: admin panel-ul salvează real în data/site.json' -ForegroundColor Green
    Start-Process $url
    php -S "localhost:$Port" -t $root
    return
}

Write-Host '  Server static: admin panel-ul merge in "Mod local" (salvează doar în browser).' -ForegroundColor Yellow
Write-Host '  Pentru testarea completă a admin panel-ului rulează:  .\preview.ps1 -Php' -ForegroundColor DarkGray
Write-Host ''

if (Have py) {
    Start-Process $url
    py -m http.server $Port --directory $root
}
elseif (Have python) {
    Start-Process $url
    python -m http.server $Port --directory $root
}
elseif (Have npx) {
    Start-Process $url
    npx --yes serve -l $Port $root
}
else {
    throw "Nu am găsit nici python, nici node. Instalează unul dintre ele, sau deschide index.html cu Live Server din VS Code."
}
