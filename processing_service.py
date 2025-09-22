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
    def process_images_professional(self, input_paths: List[str], output_dir: str, 
                                  quality: str = 'standard', convert_heic: bool = True,
                                  corrections: List[str] = None, analysis: List[str] = None) -> Dict:
        """
        Procesar múltiples imágenes con configuración profesional
        
        Args:
            input_paths: Lista de rutas de archivos de entrada
            output_dir: Directorio de salida
            quality: Nivel de procesamiento ('professional', 'standard', 'fast')
            convert_heic: Si convertir archivos HEIC a JPG
            corrections: Lista de correcciones a aplicar
            analysis: Lista de análisis a realizar
            
        Returns:
            Diccionario con estadísticas del procesamiento
        """
        if corrections is None:
            corrections = ['whiteBalance', 'exposureCorrection', 'contrastEnhancement', 'noiseReduction']
        if analysis is None:
            analysis = ['histogramAnalysis', 'exposureAnalysis', 'colorAnalysis']
            
        logger.info(f"Iniciando procesamiento profesional con {len(input_paths)} archivos")
        logger.info(f"Configuración: calidad={quality}, correcciones={corrections}, análisis={analysis}")
        
        start_time = datetime.now()
        processed_count = 0
        failed_count = 0
        total_size = 0
        
        # Crear directorio de salida si no existe
        os.makedirs(output_dir, exist_ok=True)
        
        for input_path in input_paths:
            try:
                logger.info(f"Procesando: {os.path.basename(input_path)}")
                
                # Análisis pre-processing
                analysis_results = self._perform_analysis(input_path, analysis)
                logger.info(f"Análisis completado: {analysis_results}")
                
                # Procesar imagen con correcciones específicas
                output_path = self._process_single_image_professional(
                    input_path, output_dir, quality, convert_heic, corrections
                )
                
                if output_path:
                    processed_count += 1
                    total_size += os.path.getsize(output_path)
                    logger.info(f"Imagen procesada exitosamente: {os.path.basename(output_path)}")
                else:
                    failed_count += 1
                    logger.error(f"Error procesando: {os.path.basename(input_path)}")
                    
            except Exception as e:
                failed_count += 1
                logger.error(f"Error procesando {os.path.basename(input_path)}: {str(e)}")
        
        end_time = datetime.now()
        processing_time = (end_time - start_time).total_seconds()
        
        result = {
            'processed_successfully': processed_count,
            'failed_count': failed_count,
            'total_files': len(input_paths),
            'processing_time_seconds': round(processing_time, 2),
            'total_size_bytes': total_size,
            'quality': quality,
            'corrections_applied': corrections,
            'analysis_performed': analysis
        }
        
        logger.info(f"Procesamiento completado: {processed_count}/{len(input_paths)} exitosos en {processing_time:.2f}s")
        return result

    def _perform_analysis(self, image_path: str, analysis_types: List[str]) -> Dict:
        """Realizar análisis pre-processing de la imagen"""
        results = {}
        
        try:
            import cv2
            import numpy as np
            
            # Cargar imagen
            image = cv2.imread(image_path)
            if image is None:
                return results
            
            # Análisis de histograma
            if 'histogramAnalysis' in analysis_types:
                hist = cv2.calcHist([image], [0, 1, 2], None, [256, 256, 256], [0, 256, 0, 256, 0, 256])
                results['histogram'] = {
                    'channels': len(hist),
                    'total_pixels': np.sum(hist)
                }
            
            # Análisis de exposición
            if 'exposureAnalysis' in analysis_types:
                gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
                mean_brightness = np.mean(gray)
                results['exposure'] = {
                    'mean_brightness': round(mean_brightness, 2),
                    'overexposed': mean_brightness > 200,
                    'underexposed': mean_brightness < 50
                }
            
            # Análisis de color
            if 'colorAnalysis' in analysis_types:
                mean_color = np.mean(image, axis=(0, 1))
                results['color'] = {
                    'mean_bgr': [round(c, 2) for c in mean_color],
                    'color_temperature': 'warm' if mean_color[2] > mean_color[0] else 'cool'
                }
            
            # Análisis de ruido
            if 'noiseAnalysis' in analysis_types:
                gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
                noise_level = np.std(gray)
                results['noise'] = {
                    'level': round(noise_level, 2),
                    'high_noise': noise_level > 30
                }
                
        except Exception as e:
            logger.error(f"Error en análisis: {str(e)}")
        
        return results

    def _process_single_image_professional(self, input_path: str, output_dir: str, 
                                         quality: str, convert_heic: bool, 
                                         corrections: List[str]) -> Optional[str]:
        """Procesar una sola imagen con configuración profesional"""
        try:
            # Convertir HEIC si es necesario
            if convert_heic and input_path.lower().endswith(('.heic', '.heif')):
                input_path = self.heic_converter.convert_heic_to_jpg(input_path)
            
            # Procesar con correcciones específicas
            output_path = os.path.join(output_dir, os.path.basename(input_path))
            
            # Aplicar correcciones según la configuración
            processed_image = self.image_processor.professional_edit(
                input_path, quality, corrections
            )
            
            if processed_image is not None:
                # Guardar imagen procesada
                import cv2
                cv2.imwrite(output_path, processed_image)
                return output_path
            
        except Exception as e:
            logger.error(f"Error procesando imagen {input_path}: {str(e)}")
        
        return None

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
