"""
Conversor HEIC optimizado para servidor
Maneja conversión de HEIC a JPG con calidad profesional
"""

import os
import glob
from PIL import Image
import pillow_heif
from typing import List, Dict, Optional
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class HEICConverter:
    """Conversor de archivos HEIC a JPG con optimizaciones"""
    
    def __init__(self):
        # Registrar el formato HEIF
        pillow_heif.register_heif_opener()
        self.supported_input_formats = {'.heic', '.heif'}
        self.output_format = 'JPEG'
        self.output_quality = 95
    
    def convert_single_file(self, input_path: str, output_path: str, quality: int = 95) -> bool:
        """
        Convierte un archivo HEIC individual a JPG
        
        Args:
            input_path: Ruta del archivo HEIC de entrada
            output_path: Ruta del archivo JPG de salida
            quality: Calidad de compresión (1-100)
        
        Returns:
            True si la conversión fue exitosa
        """
        try:
            # Verificar que el archivo existe
            if not os.path.exists(input_path):
                logger.error(f"Archivo no encontrado: {input_path}")
                return False
            
            # Verificar extensión
            _, ext = os.path.splitext(input_path.lower())
            if ext not in self.supported_input_formats:
                logger.error(f"Formato no soportado: {ext}")
                return False
            
            # Crear directorio de salida si no existe
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            
            # Abrir imagen HEIC
            img = Image.open(input_path)
            
            # Convertir a RGB si es necesario
            if img.mode in ('RGBA', 'LA', 'P'):
                # Crear fondo blanco para transparencias
                if img.mode == 'RGBA':
                    background = Image.new('RGB', img.size, (255, 255, 255))
                    background.paste(img, mask=img.split()[-1])  # Usar canal alpha como máscara
                    img = background
                else:
                    img = img.convert('RGB')
            elif img.mode != 'RGB':
                img = img.convert('RGB')
            
            # Guardar como JPEG con calidad especificada
            img.save(output_path, self.output_format, quality=quality, optimize=True)
            
            logger.info(f"Convertido exitosamente: {os.path.basename(input_path)} -> {os.path.basename(output_path)}")
            return True
            
        except Exception as e:
            logger.error(f"Error convirtiendo {input_path}: {e}")
            return False
    
    def convert_batch(self, input_dir: str, output_dir: str, quality: int = 95) -> Dict:
        """
        Convierte todos los archivos HEIC en un directorio
        
        Args:
            input_dir: Directorio de entrada
            output_dir: Directorio de salida
            quality: Calidad de compresión (1-100)
        
        Returns:
            Diccionario con estadísticas de conversión
        """
        stats = {
            'total_files': 0,
            'converted_successfully': 0,
            'failed': 0,
            'skipped': 0,
            'errors': []
        }
        
        try:
            # Buscar archivos HEIC
            heic_files = self.find_heic_files(input_dir)
            stats['total_files'] = len(heic_files)
            
            if not heic_files:
                logger.warning("No se encontraron archivos HEIC en el directorio")
                return stats
            
            logger.info(f"Encontrados {len(heic_files)} archivos HEIC para convertir")
            
            # Crear directorio de salida
            os.makedirs(output_dir, exist_ok=True)
            
            # Convertir cada archivo
            for input_path in heic_files:
                # Generar nombre de archivo de salida
                filename = os.path.splitext(os.path.basename(input_path))[0]
                output_path = os.path.join(output_dir, f"{filename}.jpg")
                
                # Verificar si ya existe
                if os.path.exists(output_path):
                    logger.info(f"Saltando {filename}.jpg - ya existe")
                    stats['skipped'] += 1
                    continue
                
                # Convertir archivo
                if self.convert_single_file(input_path, output_path, quality):
                    stats['converted_successfully'] += 1
                else:
                    stats['failed'] += 1
                    stats['errors'].append(f"Error convirtiendo: {os.path.basename(input_path)}")
            
            logger.info(f"Conversión completada: {stats['converted_successfully']}/{stats['total_files']} exitosos")
            return stats
            
        except Exception as e:
            logger.error(f"Error en conversión por lotes: {e}")
            stats['errors'].append(str(e))
            return stats
    
    def find_heic_files(self, root_dir: str) -> List[str]:
        """
        Encuentra todos los archivos HEIC en un directorio recursivamente
        """
        heic_files = []
        for dirpath, _, filenames in os.walk(root_dir):
            for fname in filenames:
                if any(fname.lower().endswith(ext) for ext in self.supported_input_formats):
                    full_path = os.path.join(dirpath, fname)
                    heic_files.append(full_path)
        return heic_files
    
    def get_file_info(self, file_path: str) -> Optional[Dict]:
        """
        Obtiene información de un archivo HEIC
        """
        try:
            img = Image.open(file_path)
            file_size = os.path.getsize(file_path)
            
            return {
                'width': img.width,
                'height': img.height,
                'mode': img.mode,
                'format': img.format,
                'file_size_bytes': file_size,
                'file_size_mb': file_size / (1024 * 1024)
            }
        except Exception as e:
            logger.error(f"Error obteniendo info del archivo {file_path}: {e}")
            return None
    
    def convert_with_processing(self, input_dir: str, output_dir: str, quality: int = 95) -> Dict:
        """
        Convierte HEIC a JPG y aplica procesamiento de imágenes
        
        Args:
            input_dir: Directorio de entrada
            output_dir: Directorio de salida
            quality: Calidad de compresión
        
        Returns:
            Estadísticas de conversión y procesamiento
        """
        from image_processor import ImageProcessor
        
        stats = {
            'total_files': 0,
            'converted_successfully': 0,
            'processed_successfully': 0,
            'failed': 0,
            'errors': []
        }
        
        try:
            # Buscar archivos HEIC
            heic_files = self.find_heic_files(input_dir)
            stats['total_files'] = len(heic_files)
            
            if not heic_files:
                logger.warning("No se encontraron archivos HEIC")
                return stats
            
            # Crear directorios
            temp_dir = os.path.join(output_dir, 'temp_conversion')
            final_dir = os.path.join(output_dir, 'processed')
            os.makedirs(temp_dir, exist_ok=True)
            os.makedirs(final_dir, exist_ok=True)
            
            # Inicializar procesador de imágenes
            processor = ImageProcessor()
            
            logger.info(f"Procesando {len(heic_files)} archivos HEIC...")
            
            for input_path in heic_files:
                try:
                    # Generar nombres de archivo
                    filename = os.path.splitext(os.path.basename(input_path))[0]
                    temp_path = os.path.join(temp_dir, f"{filename}.jpg")
                    final_path = os.path.join(final_dir, f"{filename}.jpg")
                    
                    # Convertir HEIC a JPG
                    if self.convert_single_file(input_path, temp_path, quality):
                        stats['converted_successfully'] += 1
                        
                        # Procesar imagen convertida
                        if processor.process_image_file(temp_path, final_path, 'high'):
                            stats['processed_successfully'] += 1
                            logger.info(f"Procesado completamente: {filename}")
                        else:
                            stats['failed'] += 1
                            stats['errors'].append(f"Error procesando: {filename}")
                    else:
                        stats['failed'] += 1
                        stats['errors'].append(f"Error convirtiendo: {filename}")
                        
                except Exception as e:
                    stats['failed'] += 1
                    stats['errors'].append(f"Error procesando {os.path.basename(input_path)}: {e}")
            
            # Limpiar archivos temporales
            try:
                import shutil
                shutil.rmtree(temp_dir)
            except:
                pass
            
            logger.info(f"Procesamiento completado: {stats['processed_successfully']}/{stats['total_files']} exitosos")
            return stats
            
        except Exception as e:
            logger.error(f"Error en conversión con procesamiento: {e}")
            stats['errors'].append(str(e))
            return stats

# Funciones de conveniencia
def convert_heic_to_jpg(input_dir: str, output_dir: str, quality: int = 95) -> Dict:
    """Función de conveniencia para conversión HEIC a JPG"""
    converter = HEICConverter()
    return converter.convert_batch(input_dir, output_dir, quality)

def convert_and_process_heic(input_dir: str, output_dir: str, quality: int = 95) -> Dict:
    """Función de conveniencia para conversión y procesamiento HEIC"""
    converter = HEICConverter()
    return converter.convert_with_processing(input_dir, output_dir, quality)

if __name__ == "__main__":
    # Ejemplo de uso
    converter = HEICConverter()
    stats = converter.convert_batch('convert_input', 'output_conversion', 95)
    print(f"Conversión completada: {stats}")
