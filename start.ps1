Write-Host "══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  ObraView — Visor BIM 3D" -ForegroundColor Cyan
Write-Host "══════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$port = 3000
$url = "http://localhost:$port"

# Try python first, fallback to node
$useNode = $false

try {
    $ver = python --version 2>&1
    if ($ver -match "Python 3") {
        Start-Process $url
        Write-Host "✓ Servidor Python iniciado en $url" -ForegroundColor Green
        Write-Host ""
        Write-Host "  Abriendo navegador..." -ForegroundColor Gray
        Write-Host "  Si no se abre, ve a: $url" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "  Presiona Ctrl+C para detener el servidor" -ForegroundColor Gray
        python -m http.server $port --bind 127.0.0.1
        exit
    }
} catch {}

try {
    $ver = node --version
    if ($ver) {
        Start-Process $url
        Write-Host "✓ Servidor Node.js iniciado en $url" -ForegroundColor Green
        Write-Host ""
        Write-Host "  Abriendo navegador..." -ForegroundColor Gray
        Write-Host "  Si no se abre, ve a: $url" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "  Presiona Ctrl+C para detener el servidor" -ForegroundColor Gray
        npx --yes http-server -p $port -a 127.0.0.1 --cors
        exit
    }
} catch {}

Write-Host "✗ Error: No se encontró Python 3 ni Node.js" -ForegroundColor Red
Write-Host "  Instala Python desde: https://python.org" -ForegroundColor Gray
