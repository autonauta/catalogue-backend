# 🎬 Compresor de Video MP4 - HighData

Script en Python con interfaz gráfica para comprimir videos MP4 usando los mejores algoritmos de compresión open source disponibles.

## ✨ Características

- **Interfaz gráfica intuitiva** con Tkinter
- **Múltiples niveles de compresión** optimizados
- **Algoritmos de última generación** (H.264, H.265/HEVC)
- **Monitoreo de progreso** en tiempo real
- **Log detallado** del proceso de compresión
- **Información del archivo** antes y después
- **Cálculo de reducción** de tamaño
- **Optimización para web** (faststart)

## 🚀 Instalación

### 1. Requisitos del Sistema

**Python 3.6+** (incluye todas las librerías necesarias)

**FFmpeg** (requerido para la compresión):
- **Windows**: Descargar desde [ffmpeg.org](https://ffmpeg.org/download.html)
- **Linux**: `sudo apt install ffmpeg`
- **macOS**: `brew install ffmpeg`

### 2. Ejecutar el Script

```bash
python video_compressor.py
```

## 🎯 Niveles de Compresión

| Nivel | Codec | Descripción | Uso Recomendado |
|-------|-------|-------------|-----------------|
| **Ultra** | H.265 | Máxima compresión, mejor calidad, más lento | Archivos finales, máxima calidad |
| **Alta** | H.265 | Alta compresión, muy buena calidad | Balance calidad/tamaño |
| **Balanceado** | H.264 | Balance perfecto entre tamaño y velocidad | Uso general |
| **Rápido** | H.264 | Compresión rápida, archivo más grande | Pruebas rápidas |
| **Sin Pérdida** | H.264 | Sin pérdida de calidad, archivo muy grande | Máxima calidad |

## 📋 Cómo Usar

1. **Ejecutar el script**: `python video_compressor.py`
2. **Seleccionar video**: Click en "Examinar" para elegir el archivo MP4
3. **Elegir carpeta de salida**: Click en "Examinar" para seleccionar destino
4. **Seleccionar nivel**: Elegir el nivel de compresión deseado
5. **Comprimir**: Click en "🚀 Comprimir Video"
6. **Monitorear**: Ver el progreso y log en tiempo real
7. **Resultado**: El archivo comprimido se guarda automáticamente

## 🔧 Configuraciones Técnicas

### H.265 (HEVC) - Ultra/Alta Compresión
- **CRF**: 23-28 (Control Rate Factor)
- **Preset**: slow/medium (velocidad vs compresión)
- **Optimizaciones**: x265-params para mejor rendimiento

### H.264 - Balanceado/Rápido
- **CRF**: 23-28
- **Preset**: medium/fast
- **Audio**: AAC 128kbps
- **Web**: faststart para carga rápida

## 📊 Información Mostrada

- **Archivo original**: Nombre, resolución, duración, FPS, tamaño
- **Progreso**: Barra de progreso en tiempo real
- **Log**: Detalles técnicos del proceso
- **Resultado**: Tamaño original vs comprimido, porcentaje de reducción

## 🛠️ Solución de Problemas

### Error: "FFmpeg no encontrado"
- Instalar FFmpeg según las instrucciones de instalación
- Verificar que FFmpeg esté en el PATH del sistema

### Error: "Permission denied"
- Verificar permisos de escritura en la carpeta de salida
- Ejecutar como administrador si es necesario

### Compresión muy lenta
- Usar preset "fast" o "medium" en lugar de "slow"
- H.264 es más rápido que H.265

### Archivo de salida muy grande
- Usar CRF más alto (28-30) para mayor compresión
- Verificar que el video original no esté ya muy comprimido

## 🎨 Personalización

El script es fácilmente personalizable:

- **Agregar nuevos presets**: Modificar `compression_presets`
- **Cambiar interfaz**: Modificar `setup_ui()`
- **Agregar formatos**: Modificar `filetypes` en `select_input_file()`
- **Optimizaciones**: Modificar comandos FFmpeg en `compress_video()`

## 📝 Notas Técnicas

- **CRF**: Valores más bajos = mejor calidad, archivo más grande
- **Preset**: slow = mejor compresión, fast = más velocidad
- **H.265**: Mejor compresión que H.264, pero más lento
- **faststart**: Mueve metadatos al inicio para carga web rápida

## 🔒 Seguridad

- No envía datos a servidores externos
- Procesamiento 100% local
- No requiere conexión a internet
- Código fuente completamente visible

---

**Desarrollado por HighData** 🚀
