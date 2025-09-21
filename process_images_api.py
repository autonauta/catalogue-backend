#!/usr/bin/env python3
"""
API de procesamiento de imágenes para integración con Express
Recibe parámetros desde línea de comandos y ejecuta el procesamiento
"""

import sys
import json
import os
import argparse
from datetime import datetime
from processing_service import ProcessingService

def main():
    """Función principal que se ejecuta desde Express"""
    try:
        # Parsear argumentos de línea de comandos
        parser = argparse.ArgumentParser(description='Procesar imágenes con IA')
        parser.add_argument('input_dir', help='Directorio de entrada')
        parser.add_argument('output_dir', help='Directorio de salida')
        parser.add_argument('--quality', default='high', choices=['high', 'medium', 'fast'], 
                          help='Calidad del procesamiento')
        parser.add_argument('--convert-heic', action='store_true', default=True,
                          help='Convertir archivos HEIC automáticamente')
        
        args = parser.parse_args()
        
        # Validar directorios
        if not os.path.exists(args.input_dir):
            print(json.dumps({
                'success': False,
                'error': f'Directorio de entrada no existe: {args.input_dir}'
            }))
            sys.exit(1)
        
        # Crear directorio de salida si no existe
        os.makedirs(args.output_dir, exist_ok=True)
        
        # Inicializar servicio de procesamiento
        service = ProcessingService()
        
        # Obtener lista de archivos de entrada
        input_files = []
        for root, dirs, files in os.walk(args.input_dir):
            for file in files:
                if any(file.lower().endswith(ext) for ext in ['.jpg', '.jpeg', '.png', '.heic', '.heif', '.tiff', '.bmp']):
                    input_files.append(os.path.join(root, file))
        
        if not input_files:
            print(json.dumps({
                'success': False,
                'error': 'No se encontraron archivos de imagen válidos'
            }))
            sys.exit(1)
        
        # Procesar imágenes
        start_time = datetime.now()
        stats = service.process_images(
            input_files, 
            args.output_dir, 
            args.quality, 
            args.convert_heic
        )
        end_time = datetime.now()
        
        # Agregar información adicional
        stats['success'] = True
        stats['processing_time_seconds'] = (end_time - start_time).total_seconds()
        stats['start_time'] = start_time.isoformat()
        stats['end_time'] = end_time.isoformat()
        
        # Guardar resultado en archivo JSON
        result_file = os.path.join(args.output_dir, 'processing_result.json')
        with open(result_file, 'w', encoding='utf-8') as f:
            json.dump(stats, f, indent=2, ensure_ascii=False)
        
        # Imprimir resultado para Express
        print(json.dumps(stats, ensure_ascii=False))
        
    except Exception as e:
        error_result = {
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }
        print(json.dumps(error_result, ensure_ascii=False))
        sys.exit(1)

if __name__ == "__main__":
    main()
