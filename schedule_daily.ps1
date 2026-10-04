param(
    [string]$Time = '12:00',
    [string]$TaskName = 'XueYouYuLi-Collector-V0'
)
$ErrorActionPreference = 'Stop'
$projectPath = $PSScriptRoot
$pythonPath = Join-Path $projectPath '.venv\Scripts\pythonw.exe'
$consolePythonPath = Join-Path $projectPath '.venv\Scripts\python.exe'
$mainPath = Join-Path $projectPath 'main.py'
$pipelinePath = Join-Path $projectPath 'daily_pipeline.py'
if (-not (Test-Path -LiteralPath $pythonPath)) {
    throw 'Create the project .venv and install requirements.txt first.'
}
if ((Get-TimeZone).Id -ne 'China Standard Time') {
    throw 'This script expects Windows timezone China Standard Time (UTC+08:00). No system timezone was changed.'
}
$timeValue = [datetime]::ParseExact($Time, 'HH:mm', [System.Globalization.CultureInfo]::InvariantCulture)
$arguments = '"' + $pipelinePath + '"'
$legacyArguments = '"' + $mainPath + '"'
$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) {
    if ($existing.Actions.Count -ne 1 -or $existing.Actions[0].Execute -notin @($pythonPath, $consolePythonPath) -or $existing.Actions[0].Arguments -notin @($arguments, $legacyArguments)) {
        throw "An unrelated task already uses the name $TaskName. It was not modified."
    }
}
$action = New-ScheduledTaskAction -Execute $pythonPath -Argument $arguments -WorkingDirectory $projectPath
$trigger = New-ScheduledTaskTrigger -Daily -At $timeValue
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 30) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
$account = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$principal = New-ScheduledTaskPrincipal -UserId $account -LogonType Interactive -RunLevel Limited
$task = New-ScheduledTask -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description 'XueYouYuLi daily shadow pipeline: Collector V0 then Summary V0.4 at 12:00 Beijing time.'
Register-ScheduledTask -TaskName $TaskName -InputObject $task -Force | Out-Null
$registered = Get-ScheduledTask -TaskName $TaskName
$info = Get-ScheduledTaskInfo -TaskName $TaskName
[pscustomobject]@{
    TaskName = $registered.TaskName
    State = [string]$registered.State
    NextRunTime = $info.NextRunTime.ToString('yyyy-MM-dd HH:mm:ss')
    LastTaskResult = $info.LastTaskResult
} | Format-List
