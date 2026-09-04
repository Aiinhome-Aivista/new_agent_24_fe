$content = Get-Content -Path 'WorkflowDetailPage.tsx' -Raw
$lines = $content -split "`n"
$lines = $lines | ForEach-Object { $_.TrimEnd("`r") }

# We will save the deleted lines to a file so we can easily read it for ApiEndpointsPage
$deletedBlock = $lines[393..712]
$deletedBlock -join "`r`n" | Set-Content -Path 'api_block.txt' -Encoding UTF8

$newLines = @()
for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($i -ge 393 -and $i -le 712) { continue }
    $newLines += $lines[$i]
}
$newLines -join "`r`n" | Set-Content -Path 'WorkflowDetailPage.tsx' -Encoding UTF8
