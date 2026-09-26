# Restores demo-target to its original Express 4 state so the Mergeable run can be rehearsed again.
# Usage (from the repo root):  powershell -ExecutionPolicy Bypass -File scripts\reset-demo.ps1 [-Bump]
#   -Bump  also simulates the Dependabot PR: installs express@5 and runs the (now red) test suite.
param([switch]$Bump)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

git checkout -- demo-target
git clean -fdq -- demo-target ':!demo-target/node_modules'
Push-Location demo-target
npm install --silent
Write-Host "demo-target reset to Express 4 (tests should be green)." -ForegroundColor Green

if ($Bump) {
  Write-Host "`nSimulating Dependabot: npm install express@5 ..." -ForegroundColor Yellow
  npm install express@5 --silent
  npm test
}
Pop-Location
