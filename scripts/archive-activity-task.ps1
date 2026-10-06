$ErrorActionPreference = 'Stop'
$repoPath = Split-Path -Parent $PSScriptRoot
$archiveFolder = 'D:\CEL3-Backups\activity'
if (-not (Test-Path -LiteralPath $repoPath) -or -not (Test-Path -LiteralPath 'D:\CEL3-Backups')) { exit 0 }
Set-Location -LiteralPath $repoPath
$nodePath = (Get-Command node.exe -ErrorAction Stop).Source
& $nodePath (Join-Path $PSScriptRoot 'archive-activity-to-drive.mjs') --destination $archiveFolder --prune 2>&1 |
    Out-File -LiteralPath (Join-Path $archiveFolder 'collector-last-run.log') -Encoding utf8
exit $LASTEXITCODE
