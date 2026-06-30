param(
  [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"

function Write-Step($Message) {
  Write-Host "[ctox-prereqs] $Message"
}

function Get-NodeMajor {
  $node = Get-Command node -ErrorAction SilentlyContinue
  if (-not $node) {
    return $null
  }
  $version = (& node --version).Trim()
  if ($version -match '^v?(\d+)\.') {
    return [int]$Matches[1]
  }
  return $null
}

function Refresh-Path {
  $machine = [Environment]::GetEnvironmentVariable("Path", "Machine")
  $user = [Environment]::GetEnvironmentVariable("Path", "User")
  $env:Path = "$machine;$user"
}

$major = Get-NodeMajor
if ($major -ge 18) {
  Write-Step "Node.js is available: $(node --version)"
  Write-Step "npm is available: $(npm --version)"
  exit 0
}

if ($SkipInstall) {
  Write-Error "Node.js 18+ is not available on PATH."
}

$winget = Get-Command winget -ErrorAction SilentlyContinue
if (-not $winget) {
  Write-Error @"
Node.js 18+ is required for the CTOX skill helper scripts, but neither node nor winget is available.
Install Node.js LTS manually from https://nodejs.org/ or with your package manager, restart the agent shell, then run:
  node ctox/scripts/validate-skill.mjs
"@
}

Write-Step "Installing Node.js LTS with winget."
winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
Refresh-Path

$major = Get-NodeMajor
if ($major -lt 18) {
  Write-Error "Node.js installation did not put node 18+ on PATH. Restart the shell or agent runtime and rerun this script."
}

Write-Step "Node.js is available: $(node --version)"
Write-Step "npm is available: $(npm --version)"
Write-Step "Windows prerequisites are ready."
