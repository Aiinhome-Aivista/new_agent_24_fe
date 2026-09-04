$content = Get-Content -Path 'WorkflowDetailPage.tsx' -Raw
$lines = $content -split "`n"
$lines = $lines | ForEach-Object { $_.TrimEnd("`r") }
$apiBlock = $lines[388..707]
$newLines = @()
for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($i -ge 388 -and $i -le 707) { continue }
    if ($i -eq 363) { $newLines += '        <Card className="h-fit sticky top-4">' }
    elseif ($i -eq 364 -or $i -eq 708) { continue }
    elseif ($i -eq 387) { $newLines += '        </Card>' }
    elseif ($i -eq 713) {
        $newLines += $lines[$i]
        $newLines += $apiBlock
    } else {
        $newLines += $lines[$i]
    }
}
$newLines -join "`r`n" | Set-Content -Path 'WorkflowDetailPage.tsx' -Encoding UTF8
