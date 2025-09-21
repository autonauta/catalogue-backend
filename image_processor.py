"""
Procesador de imágenes optimizado para servidor
Incluye algoritmos avanzados de balance de blancos, CLAHE y optimización de color
"""

import cv2
import numpy as np
from skimage import exposure
import os
from typing import List, Tuple, Optional
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ImageProcessor:
    """Procesador de imágenes con algoritmos profesionales"""
    
    def __init__(self):
        self.supported_formats = {'.jpg', '.jpeg', '.png', '.tiff', '.bmp'}
    
    def white_patch_balance(self, img: np.ndarray) -> np.ndarray:
        """
        Balance de blancos White Patch: iguala el pixel más brillante de cada canal a 255
        """
        img_float = img.astype(np.float32)
        max_vals = np.percentile(img_float.reshape(-1, 3), 99, axis=0)
        scale = 255.0 / (max_vals + 1e-6)
        for i in range(3):
            img_float[:,:,i] *= scale[i]
        img_float = np.clip(img_float, 0, 255)
        return img_float.astype(np.uint8)
    
    def gray_world_balance(self, img: np.ndarray) -> np.ndarray:
        """
        Balance de blancos Gray World: asume que el promedio de la imagen es gris
        """
        img_float = img.astype(np.float32)
        avg = np.mean(img_float, axis=(0,1))
        mean_gray = np.mean(avg)
        scale = mean_gray / (avg + 1e-6)
        for i in range(3):
            img_float[:,:,i] *= scale[i]
        img_float = np.clip(img_float, 0, 255)
        return img_float.astype(np.uint8)
    
    def advanced_white_balance(self, img: np.ndarray) -> np.ndarray:
        """
        Balance de blancos avanzado combinando múltiples métodos
        """
        img_wp = self.white_patch_balance(img)
        img_gw = self.gray_world_balance(img)
        # Mezcla adaptativa basada en la calidad de la imagen
        img_float = img.astype(np.float32)
        brightness = np.mean(img_float)
        
        if brightness < 100:  # Imagen oscura
            weight_gw, weight_wp = 0.8, 0.2
        elif brightness > 200:  # Imagen muy brillante
            weight_gw, weight_wp = 0.3, 0.7
        else:  # Imagen normal
            weight_gw, weight_wp = 0.7, 0.3
        
        return cv2.addWeighted(img_gw, weight_gw, img_wp, weight_wp, 0)
    
    def adaptive_clahe(self, img: np.ndarray) -> np.ndarray:
        """
        CLAHE adaptativo en canal L de LAB con parámetros optimizados
        """
        lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        
        # Parámetros adaptativos basados en el contraste de la imagen
        contrast = np.std(l)
        if contrast < 30:  # Imagen de bajo contraste
            clip_limit = 2.0
            tile_size = (8, 8)
        elif contrast > 80:  # Imagen de alto contraste
            clip_limit = 1.2
            tile_size = (12, 12)
        else:  # Contraste normal
            clip_limit = 1.5
            tile_size = (8, 8)
        
        clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=tile_size)
        l_clahe = clahe.apply(l)
        lab_clahe = cv2.merge((l_clahe, a, b))
        return cv2.cvtColor(lab_clahe, cv2.COLOR_LAB2BGR)
    
    def adaptive_saturation(self, img: np.ndarray) -> np.ndarray:
        """
        Saturación adaptativa en HSV con análisis inteligente
        """
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV).astype(np.float32)
        mean_sat = np.mean(hsv[:,:,1])
        std_sat = np.std(hsv[:,:,1])
        
        # Ajuste adaptativo basado en estadísticas de saturación
        if mean_sat < 50:  # Imagen desaturada
            saturation_factor = 1.4
        elif mean_sat > 180:  # Imagen sobresaturada
            saturation_factor = 0.8
        elif std_sat > 60:  # Imagen con saturación variable
            saturation_factor = 1.1
        else:  # Saturación normal
            saturation_factor = 1.0
        
        hsv[:,:,1] *= saturation_factor
        hsv[:,:,1] = np.clip(hsv[:,:,1], 0, 255)
        return cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)
    
    def noise_reduction(self, img: np.ndarray) -> np.ndarray:
        """
        Reducción de ruido adaptativa
        """
        # Detectar nivel de ruido
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        noise_level = np.std(cv2.Laplacian(gray, cv2.CV_64F))
        
        if noise_level > 50:  # Imagen ruidosa
            return cv2.bilateralFilter(img, 9, 75, 75)
        elif noise_level > 25:  # Ruido moderado
            return cv2.bilateralFilter(img, 5, 50, 50)
        else:  # Imagen limpia
            return img
    
    def professional_edit(self, img: np.ndarray, quality: str = 'high') -> np.ndarray:
        """
        Procesamiento profesional completo de la imagen
        
        Args:
            img: Imagen de entrada (BGR)
            quality: 'high', 'medium', 'fast'
        
        Returns:
            Imagen procesada
        """
        try:
            # 1. Reducción de ruido (solo en calidad alta)
            if quality == 'high':
                img = self.noise_reduction(img)
            
            # 2. Balance de blancos avanzado
            img_balanced = self.advanced_white_balance(img)
            
            # 3. CLAHE adaptativo
            img_clahe = self.adaptive_clahe(img_balanced)
            
            # 4. Tone mapping local
            img_tm = exposure.rescale_intensity(
                img_clahe, 
                in_range='image', 
                out_range=(0, 255)
            ).astype(np.uint8)
            
            # 5. Saturación adaptativa
            img_final = self.adaptive_saturation(img_tm)
            
            # 6. Ajuste final de contraste (solo en calidad alta)
            if quality == 'high':
                lab = cv2.cvtColor(img_final, cv2.COLOR_BGR2LAB)
                l, a, b = cv2.split(lab)
                l = cv2.createCLAHE(clipLimit=1.1, tileGridSize=(8,8)).apply(l)
                img_final = cv2.cvtColor(cv2.merge((l, a, b)), cv2.COLOR_LAB2BGR)
            
            return img_final
            
        except Exception as e:
            logger.error(f"Error procesando imagen: {e}")
            return img
    
    def process_image_file(self, input_path: str, output_path: str, quality: str = 'high') -> bool:
        """
        Procesa un archivo de imagen individual
        
        Args:
            input_path: Ruta del archivo de entrada
            output_path: Ruta del archivo de salida
            quality: Calidad del procesamiento
        
        Returns:
            True si el procesamiento fue exitoso
        """
        try:
            # Leer imagen
            img = cv2.imread(input_path)
            if img is None:
                logger.error(f"No se pudo leer la imagen: {input_path}")
                return False
            
            # Procesar imagen
            processed_img = self.professional_edit(img, quality)
            
            # Crear directorio de salida si no existe
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            
            # Guardar imagen procesada
            success = cv2.imwrite(output_path, processed_img)
            if not success:
                logger.error(f"No se pudo guardar la imagen: {output_path}")
                return False
            
            logger.info(f"Imagen procesada exitosamente: {output_path}")
            return True
            
        except Exception as e:
            logger.error(f"Error procesando {input_path}: {e}")
            return False
    
    def process_batch(self, input_dir: str, output_dir: str, quality: str = 'high') -> dict:
        """
        Procesa un lote de imágenes
        
        Args:
            input_dir: Directorio de entrada
            output_dir: Directorio de salida
            quality: Calidad del procesamiento
        
        Returns:
            Diccionario con estadísticas del procesamiento
        """
        stats = {
            'total_files': 0,
            'processed_successfully': 0,
            'failed': 0,
            'errors': []
        }
        
        try:
            # Buscar archivos de imagen
            image_files = self.find_images_recursive(input_dir)
            stats['total_files'] = len(image_files)
            
            if not image_files:
                logger.warning("No se encontraron imágenes válidas")
                return stats
            
            logger.info(f"Procesando {len(image_files)} imágenes...")
            
            # Procesar cada imagen
            for filename in image_files:
                input_path = os.path.join(input_dir, filename)
                output_path = os.path.join(output_dir, filename)
                
                if self.process_image_file(input_path, output_path, quality):
                    stats['processed_successfully'] += 1
                else:
                    stats['failed'] += 1
                    stats['errors'].append(f"Error procesando: {filename}")
            
            logger.info(f"Procesamiento completado: {stats['processed_successfully']}/{stats['total_files']} exitosos")
            return stats
            
        except Exception as e:
            logger.error(f"Error en procesamiento por lotes: {e}")
            stats['errors'].append(str(e))
            return stats
    
    def find_images_recursive(self, root_dir: str) -> List[str]:
        """
        Encuentra todas las imágenes válidas en un directorio recursivamente
        """
        image_paths = []
        for dirpath, _, filenames in os.walk(root_dir):
            for fname in filenames:
                if any(fname.lower().endswith(ext) for ext in self.supported_formats):
                    rel_dir = os.path.relpath(dirpath, root_dir)
                    rel_path = os.path.join(rel_dir, fname) if rel_dir != '.' else fname
                    image_paths.append(rel_path)
        return image_paths
    
    def get_image_info(self, image_path: str) -> dict:
        """
        Obtiene información de una imagen
        """
        try:
            img = cv2.imread(image_path)
            if img is None:
                return None
            
            height, width, channels = img.shape
            file_size = os.path.getsize(image_path)
            
            return {
                'width': width,
                'height': height,
                'channels': channels,
                'file_size_bytes': file_size,
                'file_size_mb': file_size / (1024 * 1024)
            }
        except Exception as e:
            logger.error(f"Error obteniendo info de imagen {image_path}: {e}")
            return None

# Función de conveniencia para uso directo
def process_images(input_dir: str, output_dir: str, quality: str = 'high') -> dict:
    """
    Función de conveniencia para procesar imágenes
    
    Args:
        input_dir: Directorio de entrada
        output_dir: Directorio de salida  
        quality: 'high', 'medium', 'fast'
    
    Returns:
        Estadísticas del procesamiento
    """
    processor = ImageProcessor()
    return processor.process_batch(input_dir, output_dir, quality)

if __name__ == "__main__":
    # Ejemplo de uso
    processor = ImageProcessor()
    stats = processor.process_batch('edit_input', 'output_edition', 'high')
    print(f"Procesamiento completado: {stats}")
