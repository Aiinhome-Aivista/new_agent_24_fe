$content = Get-Content -Path 'WorkflowDetailPage.tsx' -Raw
$lines = $content -split "`r?`n"
$apiBlock = $lines[713..1032] -join "`n"

$newLines = @()
for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($i -ge 713 -and $i -le 1032) {
        continue
    }
    
    if ($i -eq 363) {
        $newLines += '        <div className="flex flex-col gap-6 h-fit sticky top-4">'
        $newLines += '        <Card>'
    } elseif ($i -eq 387) {
        $newLines += $lines[$i]
        $newLines += $apiBlock
        $newLines += '        </div>'
    } else {
        $newLines += $lines[$i]
    }
}
$newLines -join "`n" | Set-Content -Path 'WorkflowDetailPage.tsx' -Encoding UTF8
