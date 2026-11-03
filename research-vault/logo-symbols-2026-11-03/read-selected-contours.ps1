Add-Type -AssemblyName System.Drawing
$sourcePath = Join-Path $PSScriptRoot 'lettering-study-v1.png'
$analysisPath = Join-Path $PSScriptRoot 'selected-02-mask.json'
$bitmap = [System.Drawing.Bitmap]::new($sourcePath)
try {
    if ($bitmap.Width -ne 1536 -or $bitmap.Height -ne 1024) { throw 'Unexpected source dimensions' }
    $originX = 220
    $originY = 370
    $width = 1200
    $height = 320
    $rows = [System.Collections.Generic.List[object]]::new()
    for ($row = 0; $row -lt $height; $row++) {
        $runs = [System.Collections.Generic.List[int]]::new()
        $start = -1
        for ($column = 0; $column -lt $width; $column++) {
            $pixel = $bitmap.GetPixel($originX + $column, $originY + $row)
            $isInk = $pixel.A -ge 128 -and (($pixel.R + $pixel.G + $pixel.B) / 3) -lt 128
            if ($isInk -and $start -lt 0) { $start = $column }
            if (-not $isInk -and $start -ge 0) {
                $runs.Add($start)
                $runs.Add($column - $start)
                $start = -1
            }
        }
        if ($start -ge 0) { $runs.Add($start); $runs.Add($width - $start) }
        $rows.Add($runs.ToArray())
    }
    $analysis = @{ source = 'lettering-study-v1.png'; sourceRegion = @($originX,$originY,$width,$height); threshold = 128; width = $width; height = $height; rows = $rows.ToArray() }
    [System.IO.File]::WriteAllText($analysisPath, ($analysis | ConvertTo-Json -Depth 6 -Compress), [System.Text.UTF8Encoding]::new($false))
    Write-Output 'Selected row 02 contours read for vector conversion; source PNG unchanged.'
} finally {
    $bitmap.Dispose()
}
