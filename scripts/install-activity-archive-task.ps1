$ErrorActionPreference = 'Stop'
$taskName = 'CEL3 Activity Archive'
$scriptPath = Join-Path $PSScriptRoot 'archive-activity-task.ps1'
$legacyArguments = '-NoLogo -NoProfile -NonInteractive -WindowStyle Hidden -File "' + $scriptPath + '"'
$arguments = $legacyArguments.Replace('-WindowStyle Hidden', '-ExecutionPolicy Bypass -WindowStyle Hidden')
$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existing -and $existing.Actions.Arguments -ne $arguments -and $existing.Actions.Arguments -ne $legacyArguments) { throw 'An existing task with this name has a different action; it was not changed.' }
$shellPath = (Get-Command powershell.exe -ErrorAction Stop).Source
$action = New-ScheduledTaskAction -Execute $shellPath -Argument $arguments -WorkingDirectory (Split-Path -Parent $PSScriptRoot)
$trigger = New-ScheduledTaskTrigger -Daily -At '2:15 AM'
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -Hidden -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 30)
$principal = New-ScheduledTaskPrincipal -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description 'Verify activity-log backups on the external drive before pruning their cloud archives.' -Force | Select-Object TaskName, State
