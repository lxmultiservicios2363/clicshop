# ============================================================================
# CLICSTORE — Script de renombrado de imágenes de suéteres
# ----------------------------------------------------------------------------
# Convierte archivos PNG numerados al patrón de nombre que usa ClicStore.
#
# Antes (en public\images\products\sueteres-tejidos-ca):
#   1.png, 2.png, ..., 17.png          → Cuello en V (17 archivos)
#   18.png, 19.png, ..., 70.png        → Cuello redondo (53 archivos)
#
# Después:
#   cs-v-01.png ... cs-v-17.png        → Cuello en V
#   cs-r-01.png ... cs-r-53.png        → Cuello redondo
#
# CÓMO USARLO
# -----------
# 1. Abre PowerShell en D:\clicshop
# 2. Ejecuta primero en MODO PRUEBA (no renombra nada):
#       .\renombrar-imagenes.ps1 -DryRun
# 3. Si la lista se ve correcta, ejecuta de verdad:
#       .\renombrar-imagenes.ps1
#
# SEGURIDAD
# ---------
# - Con -DryRun no se toca nada, solo se muestra lo que haría.
# - El script NUNCA sobreescribe archivos: si el destino ya existe, avisa.
# - Al final muestra un resumen con cuántos se renombraron.
# ============================================================================


# --- PARÁMETROS --------------------------------------------------------------
# Si se pasa -DryRun, el script NO renombra. Solo simula.
param(
    [switch]$DryRun
)


# --- CONFIGURACIÓN -----------------------------------------------------------
# Carpeta donde viven los archivos PNG originales.
# Ruta relativa al proyecto (funciona si abres PowerShell en D:\clicshop).
$carpeta = "public\images\products\sueteres-tejidos-ca"

# Extensión de los archivos (con el punto).
$extension = ".png"


# --- VALIDACIÓN 1: la carpeta debe existir ----------------------------------
if (-not (Test-Path -LiteralPath $carpeta)) {
    Write-Host ""
    Write-Host "  ERROR: La carpeta no existe:" -ForegroundColor Red
    Write-Host "         $carpeta" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Asegurate de ejecutar este script desde D:\clicshop" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# Mensaje inicial
Write-Host ""
Write-Host "  Carpeta de trabajo: $carpeta" -ForegroundColor Cyan
if ($DryRun) {
    Write-Host "  Modo: PRUEBA (no se renombra nada)" -ForegroundColor Yellow
} else {
    Write-Host "  Modo: REAL (se van a renombrar archivos)" -ForegroundColor Green
}
Write-Host ""


# --- CONTADORES --------------------------------------------------------------
# Cuántos se renombraron (o se renombrarían, en modo prueba)
$renombrados = 0
# Cuántos se omitieron por algún motivo
$saltados = 0
# Cuántos fallaron al renombrar
$errores = 0


# --- BUCLE PRINCIPAL --------------------------------------------------------
# Recorremos los números del 1 al 70. Cada iteración hace:
#   1. Calcular el nombre del archivo origen (ej: "1.png")
#   2. Calcular el nombre del archivo destino (ej: "cs-v-01.png")
#   3. Verificar que el origen exista
#   4. Verificar que el destino no exista ya
#   5. Renombrar (o simular, si es -DryRun)

for ($i = 1; $i -le 70; $i++) {

    # --- Nombre origen ---
    # El archivo original se llama simplemente "1.png", "2.png", etc.
    # (sin ceros iniciales, según verificamos)
    $origenNombre = "$i$extension"
    $origenRuta = Join-Path $carpeta $origenNombre

    # --- Categoría según el rango ---
    # 1..17  → Cuello en V,    índice 1..17
    # 18..70 → Cuello redondo, índice 1..53
    if ($i -le 17) {
        $tipo = "v"
        $indice = $i
    } else {
        $tipo = "r"
        $indice = $i - 17
    }

    # --- Nombre destino ---
    # Formato: cs-{v|r}-{índice con 2 dígitos}.png
    # El {0:D2} significa "número con al menos 2 dígitos, rellenando con ceros".
    $destinoNombre = "cs-{0}-{1:D2}$extension" -f $tipo, $indice
    $destinoRuta = Join-Path $carpeta $destinoNombre

    # --- Verificar que el archivo origen exista ---
    if (-not (Test-Path -LiteralPath $origenRuta -PathType Leaf)) {
        Write-Host "  [OMITIDO]  No existe: $origenNombre" -ForegroundColor DarkGray
        $saltados++
        continue   # Saltar a la siguiente iteración
    }

    # --- Verificar que el destino NO exista ya ---
    # Evita sobreescribir un archivo si se corre el script dos veces.
    if (Test-Path -LiteralPath $destinoRuta -PathType Leaf) {
        Write-Host "  [OMITIDO]  Ya existe destino: $destinoNombre" -ForegroundColor Yellow
        $saltados++
        continue
    }

    # --- Renombrar o simular ---
    if ($DryRun) {
        # En modo prueba solo mostramos lo que haría
        Write-Host "  [PRUEBA]   $origenNombre  ->  $destinoNombre" -ForegroundColor Cyan
        $renombrados++
    } else {
        # En modo real, renombramos el archivo
        try {
            Rename-Item -LiteralPath $origenRuta -NewName $destinoNombre -ErrorAction Stop
            Write-Host "  [OK]       $origenNombre  ->  $destinoNombre" -ForegroundColor Green
            $renombrados++
        } catch {
            # Si algo falla (permisos, archivo bloqueado, etc.), avisamos
            Write-Host "  [ERROR]    $origenNombre  ->  $destinoNombre" -ForegroundColor Red
            Write-Host "             $_" -ForegroundColor Red
            $errores++
        }
    }
}


# --- RESUMEN FINAL ----------------------------------------------------------
Write-Host ""
Write-Host "  ==========================================" -ForegroundColor Cyan
if ($DryRun) {
    Write-Host "  RESUMEN (modo PRUEBA, no se cambió nada)"          -ForegroundColor Yellow
    Write-Host "  Se renombrarían:      $renombrados archivos"         -ForegroundColor Cyan
    Write-Host "  Se omitirían:         $saltados archivos"            -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Para aplicar los cambios de verdad, ejecuta:"        -ForegroundColor Yellow
    Write-Host "  .\renombrar-imagenes.ps1"                            -ForegroundColor Yellow
} else {
    Write-Host "  RESUMEN FINAL"                                        -ForegroundColor Cyan
    Write-Host "  Renombrados:          $renombrados archivos"          -ForegroundColor Green
    Write-Host "  Omitidos:             $saltados archivos"             -ForegroundColor Yellow
    Write-Host "  Errores:              $errores archivos"              -ForegroundColor Red
}
Write-Host "  ==========================================" -ForegroundColor Cyan
Write-Host ""