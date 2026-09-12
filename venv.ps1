$venvPath = Join-Path $PSScriptRoot ".venv"
$activatePath = Join-Path $venvPath "Scripts\Activate.ps1"

if (-not (Test-Path $activatePath)) {
    python -m venv $venvPath
    if ($LASTEXITCODE -ne 0) {
        throw "Không thể tạo môi trường ảo. Hãy kiểm tra Python đã được cài và có trong PATH."
    }
}

. $activatePath
Write-Host "Đã bật môi trường ảo: $venvPath"
