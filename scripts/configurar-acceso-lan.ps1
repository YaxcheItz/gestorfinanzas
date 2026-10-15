param(
    [string]$DireccionIp,
    [ValidateRange(1024, 65535)][int]$PuertoFrontend = 4300
)

# Configuracion exclusivamente local; no modifica CORS de produccion ni abre comodines.
$ErrorActionPreference = 'Stop'
$raizProyecto = Split-Path -Parent $PSScriptRoot
$archivoEntorno = Join-Path $raizProyecto '.local/android-lan/backend-env.private.json'
if (!(Test-Path -LiteralPath $archivoEntorno)) { throw 'Falta el entorno privado de Android LAN.' }
$entornoLan = Get-Content -LiteralPath $archivoEntorno -Raw | ConvertFrom-Json
if ($entornoLan.SPRING_DATASOURCE_URL -notmatch '^jdbc:postgresql://127\.0\.0\.1:[0-9]+/kaptal_android_lan$') {
    throw 'Este comando solo admite el entorno local Android LAN.'
}
if (!$DireccionIp) {
    $rutaLan = Get-NetRoute -AddressFamily IPv4 -DestinationPrefix '0.0.0.0/0' |
        Sort-Object RouteMetric | Select-Object -First 1
    if (!$rutaLan) { throw 'No hay ruta de red activa. Indica -DireccionIp.' }
    $DireccionIp = Get-NetIPAddress -AddressFamily IPv4 -InterfaceIndex $rutaLan.InterfaceIndex |
        Where-Object { $_.AddressState -eq 'Preferred' -and $_.IPAddress -notlike '169.254.*' } |
        Select-Object -First 1 -ExpandProperty IPAddress
}
$ipLan = $null
if (![System.Net.IPAddress]::TryParse($DireccionIp, [ref]$ipLan) -or
    $ipLan.AddressFamily -ne [System.Net.Sockets.AddressFamily]::InterNetwork -or
    $DireccionIp -notmatch '^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)') {
    throw 'Indica una IPv4 privada de tu red local.'
}
$origenLan = "http://${DireccionIp}:$PuertoFrontend"
$entornoLan.APP_CORS_ALLOWED_ORIGINS = "http://localhost:4200,http://127.0.0.1:4200,http://localhost:$PuertoFrontend,http://127.0.0.1:$PuertoFrontend,http://${DireccionIp}:4200,http://${DireccionIp}:$PuertoFrontend,http://localhost:14200,http://127.0.0.1:14200"
$entornoLan.JWT_REFRESH_SAME_SITE = 'Lax'
$entornoLan.JWT_REFRESH_SECURE = 'false'
[System.IO.File]::WriteAllText($archivoEntorno, ($entornoLan | ConvertTo-Json -Depth 10), [System.Text.UTF8Encoding]::new($false))
Write-Output "Abre en el celular: $origenLan"
Write-Output 'Reinicia el backend local para aplicar estos origenes exactos. No se cambiaron firewall ni produccion.'
