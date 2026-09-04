$content = [System.IO.File]::ReadAllLines((Join-Path (Get-Location) 'WorkflowDetailPage.tsx'))

$newLines = @()
for ($i = 0; $i -lt $content.Length; $i++) {
    if ($i -ge 713 -and $i -le 1031) { continue }
    $newLines += $content[$i]
}

$Utf8NoBomEncoding = New-Object System.Text.UTF8Encoding $False
[System.IO.File]::WriteAllLines((Join-Path (Get-Location) 'WorkflowDetailPage.tsx'), $newLines, $Utf8NoBomEncoding)

Write-Host "Done"
