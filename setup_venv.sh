#!/bin/bash

# Script para configurar entorno virtual de Python
# Ejecutar en el servidor: bash setup_venv.sh

echo "🐍 Configurando entorno virtual de Python..."

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verificar que estamos en el directorio correcto
if [ ! -f "requirements.txt" ]; then
    print_error "No se encontró requirements.txt. Asegúrate de estar en el directorio correcto."
    exit 1
fi

# Crear entorno virtual
print_status "Creando entorno virtual..."
python3 -m venv venv

if [ $? -eq 0 ]; then
    print_status "Entorno virtual creado correctamente"
else
    print_error "Error creando entorno virtual"
    exit 1
fi

# Activar entorno virtual
print_status "Activando entorno virtual..."
source venv/bin/activate

# Actualizar pip
print_status "Actualizando pip..."
pip install --upgrade pip

# Instalar dependencias
print_status "Instalando dependencias Python..."
pip install -r requirements.txt

if [ $? -eq 0 ]; then
    print_status "Dependencias instaladas correctamente"
else
    print_error "Error instalando dependencias"
    exit 1
fi

# Verificar instalación
print_status "Verificando instalación..."
venv/bin/python -c "
import sys
sys.path.append('.')
try:
    from image_processor import ImageProcessor
    from heic_converter import HEICConverter
    print('✅ Scripts Python funcionan correctamente')
except Exception as e:
    print(f'⚠️  Error en scripts Python: {e}')
"

# Crear script de activación
cat > activate_venv.sh << 'EOF'
#!/bin/bash
# Script para activar el entorno virtual
source venv/bin/activate
echo "🐍 Entorno virtual activado"
echo "Python: $(which python)"
echo "Pip: $(which pip)"
EOF

chmod +x activate_venv.sh

print_status "¡Configuración del entorno virtual completada!"
echo ""
echo "🔧 Comandos útiles:"
echo "   source venv/bin/activate    # Activar entorno virtual"
echo "   deactivate                # Desactivar entorno virtual"
echo "   ./activate_venv.sh         # Script de activación"
echo ""
echo "📁 Archivos creados:"
echo "   venv/                      # Entorno virtual"
echo "   activate_venv.sh           # Script de activación"
echo ""
print_status "¡Listo para usar!"
