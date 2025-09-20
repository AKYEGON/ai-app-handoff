# Simple PowerShell static file server
# Serves files from the repository root on http://127.0.0.1:5173/
$folder = 'C:\AKYEGON\ai-app-handoff'
$prefix = 'http://127.0.0.1:5173/'

Add-Type -AssemblyName System.Net.HttpListener
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)
try {
    $listener.Start()
    Write-Host "Serving $folder at $prefix"
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        try {
            $req = $context.Request
            $res = $context.Response
            $pathPart = [System.Uri]::UnescapeDataString($req.Url.AbsolutePath.TrimStart('/'))
            if ([string]::IsNullOrEmpty($pathPart)) { $pathPart = 'index.html' }
            $localPath = Join-Path $folder $pathPart

            if (Test-Path $localPath -PathType Leaf) {
                $bytes = [System.IO.File]::ReadAllBytes($localPath)
                switch ([IO.Path]::GetExtension($localPath).ToLower()) {
                    '.html' { $res.ContentType = 'text/html' }
                    '.htm'  { $res.ContentType = 'text/html' }
                    '.css'  { $res.ContentType = 'text/css' }
                    '.js'   { $res.ContentType = 'application/javascript' }
                    '.json' { $res.ContentType = 'application/json' }
                    '.png'  { $res.ContentType = 'image/png' }
                    '.jpg'  { $res.ContentType = 'image/jpeg' }
                    '.jpeg' { $res.ContentType = 'image/jpeg' }
                    '.svg'  { $res.ContentType = 'image/svg+xml' }
                    '.txt'  { $res.ContentType = 'text/plain' }
                    default { $res.ContentType = 'application/octet-stream' }
                }
                $res.ContentLength64 = $bytes.Length
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
            }
            else {
                $res.StatusCode = 404
                $msg = [System.Text.Encoding]::UTF8.GetBytes('404 Not Found')
                $res.ContentLength64 = $msg.Length
                $res.OutputStream.Write($msg, 0, $msg.Length)
            }
        }
        catch {
            # ignore per-request errors
        }
        finally {
            $res.OutputStream.Close()
        }
    }
}
catch {
    Write-Host "Server error: $_"
}
finally {
    if ($listener -and $listener.IsListening) { $listener.Stop() }
}
