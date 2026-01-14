$ErrorActionPreference = "Stop"
$base = "http://localhost:3000"

function Login($email, $password) {
  $body = @{ email=$email; password=$password } | ConvertTo-Json
  $resp = irm -Method Post -Uri "$base/auth/login" -ContentType "application/json" -Body $body
  return @{ Authorization = "Bearer $($resp.token)" }
}

function TryCall($label, [scriptblock]$fn) {
  try {
    $r = & $fn
    Write-Host "✅ $label" -ForegroundColor Green
    return $r
  } catch {
    $msg = $_.Exception.Message
    Write-Host "❌ $label -> $msg" -ForegroundColor Red
    throw
  }
}

# --- Tokens por rol ---
$hAdmin = Login "admin@diprochil.cl" "Admin123456!"
$hSup   = Login "supervisor1@diprochil.cl" "Sup123456!"
$hCon   = Login "conductor1@diprochil.cl" "Con123456!"

TryCall "ME admin" { irm "$base/auth/me" -Headers $hAdmin | Out-Null }
TryCall "ME supervisor" { irm "$base/auth/me" -Headers $hSup | Out-Null }
TryCall "ME conductor" { irm "$base/auth/me" -Headers $hCon | Out-Null }

# --- Listados permitidos ---
TryCall "List vehicles (SUPERVISOR)" { irm "$base/vehicles?take=5" -Headers $hSup | Out-Null }
TryCall "List pedidos (SUPERVISOR)"  { irm "$base/pedidos?take=5"  -Headers $hSup | Out-Null }
TryCall "List incidents (SUPERVISOR)"{ irm "$base/incidents?take=5" -Headers $hSup | Out-Null }

# --- Bloqueos esperados (SUPERVISOR no crea vehicles ni pedidos) ---
TryCall "SUPERVISOR forbidden create vehicle (esperado)" {
  $veh = @{ patente="ZZ-ZZ-99"; capacidadKg=1000; tipo="Demo"; estado="ACTIVO" } | ConvertTo-Json
  try {
    irm -Method Post -Uri "$base/vehicles" -Headers $hSup -ContentType "application/json" -Body $veh | Out-Null
    throw "Debería haber sido Forbidden y no lo fue"
  } catch {
    # OK: esperamos Forbidden
  }
}

# --- Conductor: rutas propias ---
$fecha = "2025-12-30"
TryCall "CONDUCTOR my routes" { irm "$base/routes/my?date=$fecha" -Headers $hCon }

# --- Conductor: update stop (alias y NO_ENTREGADA + incidente) ---
# OJO: ajusta routeId/stopId si en tu BD son distintos
$routeId = 1
$stopId  = 2

TryCall "CONDUCTOR set stop COMPLETADA (alias ENTREGADA)" {
  $b = @{ estadoParada="ENTREGADA" } | ConvertTo-Json
  irm -Method Patch -Uri "$base/routes/$routeId/stops/$stopId" -Headers $hCon -ContentType "application/json" -Body $b | Out-Null
}

TryCall "CONDUCTOR set stop NO_ENTREGADA + incidente" {
  $b = @{
    estadoParada="NO_ENTREGADA"
    incidente = @{
      tipo="Cliente ausente"
      descripcion="Cliente no se encontraba en domicilio."
      severidad="BAJA"
    }
  } | ConvertTo-Json -Depth 10
  irm -Method Patch -Uri "$base/routes/$routeId/stops/$stopId" -Headers $hCon -ContentType "application/json" -Body $b | Out-Null
}

TryCall "Dashboard route (CONDUCTOR permitido)" {
  irm "$base/routes/$routeId/dashboard" -Headers $hCon | Out-Null
}

Write-Host "`n✅ Smoke tests OK" -ForegroundColor Cyan
