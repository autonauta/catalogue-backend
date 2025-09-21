#!/usr/bin/env python3
"""
Script para procesar imágenes desde la API
Recibe archivos de la carpeta temporal y los procesa
"""

import sys
import os
import json
import argparse
from pathlib import Path
from processing_service import ProcessingService

def main():
    """Función principal para procesar imágenes desde la API"""
    
    # Configurar argumentos de línea de comandos
    parser = argparse.ArgumentParser(description='Procesar imágenes desde la API')
    parser.add_argument('--quality', choices=['high', 'medium', 'fast'], default='high',
                       help='Calidad del procesamiento')
    parser.add_argument('--convert-heic', action='store_true',
                       help='Convertir archivos HEIC a JPG')
    parser.add_argument('input_dir', help='Directorio de entrada')
    parser.add_argument('output_dir', help='Directorio de salida')
    
    args = parser.parse_args()
    
    try:
        # Verificar que el directorio de entrada existe
        if not os.path.exists(args.input_dir):
            print(json.dumps({
                "success": False,
                "error": f"Directorio de entrada no existe: {args.input_dir}"
            }))
            sys.exit(1)
        
        # Crear directorio de salida si no existe
        os.makedirs(args.output_dir, exist_ok=True)
        
        # Obtener lista de archivos de entrada
        input_files = []
        for file_path in Path(args.input_dir).iterdir():
            if file_path.is_file():
                # Verificar que es un archivo de imagen
                ext = file_path.suffix.lower()
                if ext in ['.jpg', '.jpeg', '.png', '.heic', '.heif', '.tiff', '.bmp']:
                    input_files.append(str(file_path))
        
        if not input_files:
            print(json.dumps({
                "success": False,
                "error": "No se encontraron archivos de imagen en el directorio de entrada"
            }))
            sys.exit(1)
        
        # Crear servicio de procesamiento
        service = ProcessingService()
        
        # Procesar imágenes
        result = service.process_images(
            input_paths=input_files,
            output_dir=args.output_dir,
            quality=args.quality,
            convert_heic=args.convert_heic
        )
        
        # Imprimir resultado en formato JSON
        print(json.dumps({
            "success": True,
            "result": result,
            "input_files": input_files,
            "output_dir": args.output_dir,
            "quality": args.quality,
            "convert_heic": args.convert_heic
        }))
        
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": f"Error en el procesamiento: {str(e)}"
        }))
        sys.exit(1)

if __name__ == "__main__":
    main()