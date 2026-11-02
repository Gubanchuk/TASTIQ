$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath 'E:\project\TASTIQ'
$ledgerDir = Join-Path (Get-Location) 'research-vault/taste-quality-strategy-2026-10/eval/quality-round-2'
$ledger = Get-Content -LiteralPath (Join-Path $ledgerDir 'budget.json') -Raw | ConvertFrom-Json
if (@($ledger.calls | Where-Object status -ne 'settled').Count -ne 0) { throw 'Unsettled receipts; no runtime change or paid request.' }
if ($ledger.haltReason) { throw 'Ledger halted; inspect before continuing.' }
$runtimeOwner = [int](Get-Content -LiteralPath 'data/runtime/server-5177.pid' -Raw)
$ownerProcess = Get-CimInstance Win32_Process -Filter "ProcessId=$runtimeOwner"
if (-not $ownerProcess -or $ownerProcess.Name -ne 'node.exe' -or $ownerProcess.CommandLine -notmatch 'src[/\\]server[/\\]server\.js') { throw 'Unexpected production owner.' }
$listeners = @(Get-NetTCPConnection -LocalPort 5177 -State Listen)
if ($listeners.Count -eq 0 -or @($listeners | Where-Object OwningProcess -ne $runtimeOwner).Count) { throw 'Unexpected port owner.' }
$env:AI_ACCESS = 'all'
$env:OPENAI_MODEL = 'gpt-6.1-sol'
$env:AI_EFFORT = 'low'
$env:AI_EVAL_BUDGET_DIR = $ledgerDir
$env:AI_EVAL_BATCH_ID = 'interactive-20261031'
$env:AI_EVAL_BATCH_CAP = '0.75'
$env:JOURNAL_PATH = Join-Path (Get-Location) 'data/journal.ndjson'
$env:PORT = '5177'
$runnerExit = 1
try {
  taskkill.exe /PID $runtimeOwner /F
  if ($LASTEXITCODE -ne 0) { throw 'Verified server did not stop.' }
  if (Get-Process -Id $runtimeOwner -ErrorAction SilentlyContinue) { throw 'Verified server is still running.' }
  $lockFile = Join-Path $ledgerDir 'budget.lock'
  if (Test-Path -LiteralPath $lockFile) {
    Move-Item -LiteralPath $lockFile -Destination ($lockFile + '.stale-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
  }
  node --max-old-space-size=8192 research-vault/overnight-2026-11/live-round-2.mjs --run
  $runnerExit = $LASTEXITCODE
} finally {
  $stillListening = @(Get-NetTCPConnection -LocalPort 5177 -State Listen -ErrorAction SilentlyContinue)
  if ($stillListening.Count -eq 0) {
    $restored = Start-Process -FilePath (Get-Command node.exe).Source -ArgumentList '--max-old-space-size=8192','src/server/server.js' -WorkingDirectory (Get-Location).Path -WindowStyle Hidden -RedirectStandardOutput 'data/runtime/server-5177.out.log' -RedirectStandardError 'data/runtime/server-5177.err.log' -PassThru
    Set-Content -LiteralPath 'data/runtime/server-5177.pid' -Value $restored.Id
    Write-Output ('productionRestoredPid=' + $restored.Id)
  }
}
exit $runnerExit
