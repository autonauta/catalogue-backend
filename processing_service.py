"""
Servicio principal de procesamiento de imágenes
Integra conversión HEIC y procesamiento profesional
"""

import os
import tempfile
import shutil
from typing import Dict, List, Optional, Tuple
import logging
from datetime import datetime
import uuid

from image_processor import ImageProcessor
from heic_converter import HEICConverter

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ProcessingService:
    """Servicio principal de procesamiento de imágenes"""
    
    def __init__(self, temp_dir: str = None):
        self.temp_dir = temp_dir or tempfile.gettempdir()
        self.image_processor = ImageProcessor()
        self.heic_converter = HEICConverter()
        
        # Crear directorio temporal si no existe
        os.makedirs(self.temp_dir, exist_ok=True)
    
    def process_images(self, 
                      input_paths: List[str], 
                      output_dir: str,
                      quality: str = 'high',
                      convert_heic: bool = True) -> Dict:
        """
        Procesa una lista de imágenes con opciones avanzadas
        
        Args:
            input_paths: Lista de rutas de archivos de entrada
            output_dir: Directorio de salida
            quality: Calidad del procesamiento ('high', 'medium', 'fast')
            convert_heic: Si debe convertir archivos HEIC automáticamente
        
        Returns:
            Diccionario con estadísticas del procesamiento
        """
        job_id = str(uuid.uuid4())
        job_temp_dir = os.path.join(self.temp_dir, f"job_{job_id}")
        
        stats = {
            'job_id': job_id,
            'total_files': len(input_paths),
            'processed_successfully': 0,
            'converted_heic': 0,
            'failed': 0,
            'skipped': 0,
            'errors': [],
            'output_files': [],
            'processing_time': 0
        }
        
        start_time = datetime.now()
        
        try:
            # Crear directorio temporal del job
            os.makedirs(job_temp_dir, exist_ok=True)
            os.makedirs(output_dir, exist_ok=True)
            
            logger.info(f"Iniciando procesamiento de {len(input_paths)} archivos (Job: {job_id})")
            
            # Procesar cada archivo
            for input_path in input_paths:
                try:
                    if not os.path.exists(input_path):
                        stats['errors'].append(f"Archivo no encontrado: {input_path}")
                        stats['failed'] += 1
                        continue
                    
                    # Determinar tipo de archivo
                    _, ext = os.path.splitext(input_path.lower())
                    filename = os.path.basename(input_path)
                    output_filename = os.path.splitext(filename)[0] + '.jpg'
                    output_path = os.path.join(output_dir, output_filename)
                    
                    # Verificar si ya existe
                    if os.path.exists(output_path):
                        logger.info(f"Saltando {output_filename} - ya existe")
                        stats['skipped'] += 1
                        stats['output_files'].append(output_path)
                        continue
                    
                    # Procesar según el tipo de archivo
                    if ext in {'.heic', '.heif'} and convert_heic:
                        # Convertir HEIC y procesar
                        temp_path = os.path.join(job_temp_dir, f"temp_{filename}.jpg")
                        
                        if self.heic_converter.convert_single_file(input_path, temp_path, 95):
                            stats['converted_heic'] += 1
                            
                            # Procesar imagen convertida
                            if self.image_processor.process_image_file(temp_path, output_path, quality):
                                stats['processed_successfully'] += 1
                                stats['output_files'].append(output_path)
                                logger.info(f"HEIC procesado exitosamente: {output_filename}")
                            else:
                                stats['failed'] += 1
                                stats['errors'].append(f"Error procesando HEIC: {filename}")
                        else:
                            stats['failed'] += 1
                            stats['errors'].append(f"Error convirtiendo HEIC: {filename}")
                    
                    elif ext in {'.jpg', '.jpeg', '.png', '.tiff', '.bmp'}:
                        # Procesar imagen directamente
                        if self.image_processor.process_image_file(input_path, output_path, quality):
                            stats['processed_successfully'] += 1
                            stats['output_files'].append(output_path)
                            logger.info(f"Imagen procesada exitosamente: {output_filename}")
                        else:
                            stats['failed'] += 1
                            stats['errors'].append(f"Error procesando: {filename}")
                    
                    else:
                        stats['skipped'] += 1
                        stats['errors'].append(f"Formato no soportado: {ext}")
                        logger.warning(f"Formato no soportado: {ext} en {filename}")
                
                except Exception as e:
                    stats['failed'] += 1
                    stats['errors'].append(f"Error procesando {filename}: {str(e)}")
                    logger.error(f"Error procesando {filename}: {e}")
            
            # Calcular tiempo de procesamiento
            stats['processing_time'] = (datetime.now() - start_time).total_seconds()
            
            logger.info(f"Procesamiento completado: {stats['processed_successfully']}/{stats['total_files']} exitosos en {stats['processing_time']:.2f}s")
            
        except Exception as e:
            logger.error(f"Error en procesamiento: {e}")
            stats['errors'].append(str(e))
        
        finally:
            # Limpiar directorio temporal
            try:
                shutil.rmtree(job_temp_dir)
            except:
                pass
        
        return stats
    
    def process_directory(self, 
                          input_dir: str, 
                          output_dir: str,
                          quality: str = 'high',
                          convert_heic: bool = True,
                          recursive: bool = True) -> Dict:
        """
        Procesa todos los archivos de imagen en un directorio
        
        Args:
            input_dir: Directorio de entrada
            output_dir: Directorio de salida
            quality: Calidad del procesamiento
            convert_heic: Si debe convertir HEIC automáticamente
            recursive: Si debe buscar recursivamente
        
        Returns:
            Estadísticas del procesamiento
        """
        try:
            # Buscar archivos de imagen
            if recursive:
                image_files = self.image_processor.find_images_recursive(input_dir)
            else:
                image_files = []
                for file in os.listdir(input_dir):
                    if any(file.lower().endswith(ext) for ext in {'.jpg', '.jpeg', '.png', '.heic', '.heif', '.tiff', '.bmp'}):
                        image_files.append(os.path.join(input_dir, file))
            
            if not image_files:
                return {
                    'total_files': 0,
                    'processed_successfully': 0,
                    'errors': ['No se encontraron imágenes válidas']
                }
            
            # Procesar archivos encontrados
            return self.process_images(image_files, output_dir, quality, convert_heic)
            
        except Exception as e:
            logger.error(f"Error procesando directorio: {e}")
            return {
                'total_files': 0,
                'processed_successfully': 0,
                'errors': [str(e)]
            }
    
    def get_supported_formats(self) -> Dict:
        """Retorna los formatos soportados"""
        return {
            'input_formats': {
                'images': ['.jpg', '.jpeg', '.png', '.tiff', '.bmp'],
                'heic': ['.heic', '.heif']
            },
            'output_format': '.jpg',
            'quality_levels': ['high', 'medium', 'fast']
        }
    
    def validate_input(self, input_paths: List[str]) -> Dict:
        """
        Valida archivos de entrada
        
        Returns:
            Diccionario con información de validación
        """
        validation = {
            'valid_files': [],
            'invalid_files': [],
            'heic_files': [],
            'total_size_mb': 0
        }
        
        for path in input_paths:
            try:
                if not os.path.exists(path):
                    validation['invalid_files'].append({'path': path, 'reason': 'No existe'})
                    continue
                
                # Verificar tamaño
                file_size = os.path.getsize(path)
                validation['total_size_mb'] += file_size / (1024 * 1024)
                
                # Verificar formato
                _, ext = os.path.splitext(path.lower())
                if ext in {'.heic', '.heif'}:
                    validation['heic_files'].append(path)
                    validation['valid_files'].append(path)
                elif ext in {'.jpg', '.jpeg', '.png', '.tiff', '.bmp'}:
                    validation['valid_files'].append(path)
                else:
                    validation['invalid_files'].append({'path': path, 'reason': f'Formato no soportado: {ext}'})
            
            except Exception as e:
                validation['invalid_files'].append({'path': path, 'reason': str(e)})
        
        return validation

# Funciones de conveniencia
def process_images(input_paths: List[str], output_dir: str, quality: str = 'high') -> Dict:
    """Función de conveniencia para procesar imágenes"""
    service = ProcessingService()
    return service.process_images(input_paths, output_dir, quality)

def process_directory(input_dir: str, output_dir: str, quality: str = 'high') -> Dict:
    """Función de conveniencia para procesar directorio"""
    service = ProcessingService()
    return service.process_directory(input_dir, output_dir, quality)

if __name__ == "__main__":
    # Ejemplo de uso
    service = ProcessingService()
    
    # Procesar directorio
    stats = service.process_directory('edit_input', 'output_edition', 'high')
    print(f"Procesamiento completado: {stats}")
