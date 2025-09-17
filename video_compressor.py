#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Compresor de Video MP4 con Interfaz Gráfica
Usa FFmpeg con los mejores algoritmos de compresión open source
"""

import tkinter as tk
from tkinter import ttk, filedialog, messagebox
import subprocess
import os
import threading
from pathlib import Path
import json

class VideoCompressor:
    def __init__(self, root):
        self.root = root
        self.root.title("Compresor de Video MP4 - HighData")
        self.root.geometry("600x500")
        self.root.resizable(True, True)
        
        # Variables
        self.input_file = tk.StringVar()
        self.output_folder = tk.StringVar()
        self.compression_level = tk.StringVar(value="balanced")
        self.progress_var = tk.DoubleVar()
        
        # Configuraciones de compresión
        self.compression_presets = {
            "ultra": {
                "name": "Ultra Compresión (H.265) ⚠️",
                "crf": 28,
                "preset": "slow",
                "codec": "libx265",
                "description": "Máxima compresión, mejor calidad, más lento - REQUIERE CODECS HEVC"
            },
            "high": {
                "name": "Alta Compresión (H.265) ⚠️",
                "crf": 23,
                "preset": "medium",
                "codec": "libx265", 
                "description": "Alta compresión, muy buena calidad - REQUIERE CODECS HEVC"
            },
            "balanced": {
                "name": "Balanceado (H.264) ✅",
                "crf": 23,
                "preset": "medium",
                "codec": "libx264",
                "description": "Balance perfecto entre tamaño y velocidad - COMPATIBLE UNIVERSAL"
            },
            "fast": {
                "name": "Rápido (H.264) ✅",
                "crf": 28,
                "preset": "fast",
                "codec": "libx264",
                "description": "Compresión rápida, archivo más grande - COMPATIBLE UNIVERSAL"
            },
            "lossless": {
                "name": "Sin Pérdida (H.264) ✅",
                "crf": 0,
                "preset": "slow",
                "codec": "libx264",
                "description": "Sin pérdida de calidad, archivo muy grande - COMPATIBLE UNIVERSAL"
            }
        }
        
        self.setup_ui()
        self.check_ffmpeg()
    
    def setup_ui(self):
        # Frame principal
        main_frame = ttk.Frame(self.root, padding="20")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Configurar grid
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)
        main_frame.columnconfigure(1, weight=1)
        
        # Título
        title_label = ttk.Label(main_frame, text="🎬 Compresor de Video MP4", 
                               font=("Arial", 16, "bold"))
        title_label.grid(row=0, column=0, columnspan=3, pady=(0, 20))
        
        # Selección de archivo de entrada
        ttk.Label(main_frame, text="Video de Entrada:").grid(row=1, column=0, sticky=tk.W, pady=5)
        ttk.Entry(main_frame, textvariable=self.input_file, width=50).grid(row=1, column=1, sticky=(tk.W, tk.E), padx=(10, 5), pady=5)
        ttk.Button(main_frame, text="Examinar", command=self.select_input_file).grid(row=1, column=2, padx=(5, 0), pady=5)
        
        # Selección de carpeta de salida
        ttk.Label(main_frame, text="Carpeta de Salida:").grid(row=2, column=0, sticky=tk.W, pady=5)
        ttk.Entry(main_frame, textvariable=self.output_folder, width=50).grid(row=2, column=1, sticky=(tk.W, tk.E), padx=(10, 5), pady=5)
        ttk.Button(main_frame, text="Examinar", command=self.select_output_folder).grid(row=2, column=2, padx=(5, 0), pady=5)
        
        # Nivel de compresión
        ttk.Label(main_frame, text="Nivel de Compresión:").grid(row=3, column=0, sticky=tk.W, pady=5)
        compression_frame = ttk.Frame(main_frame)
        compression_frame.grid(row=3, column=1, columnspan=2, sticky=(tk.W, tk.E), padx=(10, 0), pady=5)
        
        # Radio buttons para niveles de compresión
        for i, (key, preset) in enumerate(self.compression_presets.items()):
            rb = ttk.Radiobutton(compression_frame, text=preset["name"], 
                               variable=self.compression_level, value=key,
                               command=self.on_compression_change)
            rb.grid(row=i, column=0, sticky=tk.W, pady=2)
            
            # Descripción
            desc_label = ttk.Label(compression_frame, text=f"  - {preset['description']}", 
                                 font=("Arial", 8), foreground="gray")
            desc_label.grid(row=i, column=1, sticky=tk.W, padx=(20, 0))
        
        # Información del archivo seleccionado
        self.info_label = ttk.Label(main_frame, text="", foreground="blue")
        self.info_label.grid(row=4, column=0, columnspan=3, pady=10)
        
        # Barra de progreso
        ttk.Label(main_frame, text="Progreso:").grid(row=5, column=0, sticky=tk.W, pady=(20, 5))
        self.progress_bar = ttk.Progressbar(main_frame, variable=self.progress_var, 
                                          maximum=100, length=400)
        self.progress_bar.grid(row=5, column=1, columnspan=2, sticky=(tk.W, tk.E), 
                             padx=(10, 0), pady=(20, 5))
        
        # Label de estado
        self.status_label = ttk.Label(main_frame, text="Listo para comprimir", 
                                    foreground="green")
        self.status_label.grid(row=6, column=0, columnspan=3, pady=5)
        
        # Botones
        button_frame = ttk.Frame(main_frame)
        button_frame.grid(row=7, column=0, columnspan=3, pady=20)
        
        self.compress_button = ttk.Button(button_frame, text="🚀 Comprimir Video", 
                                        command=self.start_compression, style="Accent.TButton")
        self.compress_button.pack(side=tk.LEFT, padx=(0, 10))
        
        ttk.Button(button_frame, text="📁 Abrir Carpeta de Salida", 
                  command=self.open_output_folder).pack(side=tk.LEFT, padx=10)
        
        ttk.Button(button_frame, text="❌ Salir", 
                  command=self.root.quit).pack(side=tk.LEFT, padx=(10, 0))
        
        # Log de salida
        log_frame = ttk.LabelFrame(main_frame, text="Log de Procesamiento", padding="10")
        log_frame.grid(row=8, column=0, columnspan=3, sticky=(tk.W, tk.E, tk.N, tk.S), pady=10)
        log_frame.columnconfigure(0, weight=1)
        log_frame.rowconfigure(0, weight=1)
        
        self.log_text = tk.Text(log_frame, height=8, wrap=tk.WORD, font=("Consolas", 9))
        scrollbar = ttk.Scrollbar(log_frame, orient=tk.VERTICAL, command=self.log_text.yview)
        self.log_text.configure(yscrollcommand=scrollbar.set)
        
        self.log_text.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        scrollbar.grid(row=0, column=1, sticky=(tk.N, tk.S))
        
        # Configurar el grid para que el log se expanda
        main_frame.rowconfigure(8, weight=1)
    
    def on_compression_change(self):
        """Mostrar advertencia cuando se selecciona H.265"""
        selected = self.compression_level.get()
        if selected in ["ultra", "high"]:
            self.log("⚠️ ADVERTENCIA: H.265/HEVC requiere codecs especiales para reproducirse")
            self.log("   Recomendado: Usar 'Balanceado' o 'Rápido' (H.264) para máxima compatibilidad")
        else:
            self.log("✅ H.264 seleccionado - Compatible con todos los reproductores")
    
    def check_ffmpeg(self):
        """Verificar si FFmpeg está instalado"""
        try:
            result = subprocess.run(['ffmpeg', '-version'], 
                                  capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                self.log("✅ FFmpeg detectado correctamente")
                return True
        except (subprocess.TimeoutExpired, FileNotFoundError):
            pass
        
        self.log("❌ FFmpeg no encontrado. Por favor instala FFmpeg:")
        self.log("   Windows: https://ffmpeg.org/download.html")
        self.log("   Linux: sudo apt install ffmpeg")
        self.log("   macOS: brew install ffmpeg")
        return False
    
    def select_input_file(self):
        """Seleccionar archivo de video de entrada"""
        file_path = filedialog.askopenfilename(
            title="Seleccionar Video MP4",
            filetypes=[
                ("Videos MP4", "*.mp4"),
                ("Videos", "*.mp4 *.avi *.mov *.mkv *.wmv"),
                ("Todos los archivos", "*.*")
            ]
        )
        
        if file_path:
            self.input_file.set(file_path)
            self.show_file_info(file_path)
    
    def select_output_folder(self):
        """Seleccionar carpeta de salida"""
        folder_path = filedialog.askdirectory(title="Seleccionar Carpeta de Salida")
        if folder_path:
            self.output_folder.set(folder_path)
    
    def show_file_info(self, file_path):
        """Mostrar información del archivo seleccionado"""
        try:
            file_size = os.path.getsize(file_path)
            size_mb = file_size / (1024 * 1024)
            
            # Obtener información del video con FFprobe
            cmd = [
                'ffprobe', '-v', 'quiet', '-print_format', 'json', 
                '-show_format', '-show_streams', file_path
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                info = json.loads(result.stdout)
                video_stream = next((s for s in info['streams'] if s['codec_type'] == 'video'), None)
                
                if video_stream:
                    duration = float(info['format']['duration'])
                    width = video_stream['width']
                    height = video_stream['height']
                    fps = eval(video_stream['r_frame_rate'])
                    
                    info_text = f"📁 {os.path.basename(file_path)} | "
                    info_text += f"📏 {width}x{height} | "
                    info_text += f"⏱️ {duration:.1f}s | "
                    info_text += f"🎞️ {fps:.1f}fps | "
                    info_text += f"💾 {size_mb:.1f}MB"
                    
                    self.info_label.config(text=info_text)
                else:
                    self.info_label.config(text=f"📁 {os.path.basename(file_path)} | 💾 {size_mb:.1f}MB")
            else:
                self.info_label.config(text=f"📁 {os.path.basename(file_path)} | 💾 {size_mb:.1f}MB")
                
        except Exception as e:
            self.log(f"Error al obtener información del archivo: {e}")
            self.info_label.config(text=f"📁 {os.path.basename(file_path)}")
    
    def start_compression(self):
        """Iniciar compresión en un hilo separado"""
        if not self.input_file.get():
            messagebox.showerror("Error", "Por favor selecciona un archivo de video")
            return
        
        if not self.output_folder.get():
            messagebox.showerror("Error", "Por favor selecciona una carpeta de salida")
            return
        
        if not self.check_ffmpeg():
            messagebox.showerror("Error", "FFmpeg no está instalado o no se puede ejecutar")
            return
        
        # Deshabilitar botón durante compresión
        self.compress_button.config(state='disabled')
        self.progress_var.set(0)
        self.status_label.config(text="Iniciando compresión...", foreground="orange")
        
        # Iniciar compresión en hilo separado
        thread = threading.Thread(target=self.compress_video)
        thread.daemon = True
        thread.start()
    
    def compress_video(self):
        """Comprimir el video usando FFmpeg"""
        try:
            input_path = self.input_file.get()
            output_folder = self.output_folder.get()
            
            # Generar nombre de archivo de salida
            input_name = Path(input_path).stem
            preset = self.compression_presets[self.compression_level.get()]
            output_name = f"{input_name}_compressed_{self.compression_level.get()}.mp4"
            output_path = os.path.join(output_folder, output_name)
            
            self.log(f"🎬 Iniciando compresión: {os.path.basename(input_path)}")
            self.log(f"📁 Salida: {output_name}")
            self.log(f"⚙️ Preset: {preset['name']}")
            
            # Comando FFmpeg optimizado
            cmd = [
                'ffmpeg',
                '-i', input_path,
                '-c:v', preset['codec'],
                '-crf', str(preset['crf']),
                '-preset', preset['preset'],
                '-c:a', 'aac',  # Audio codec
                '-b:a', '128k',  # Audio bitrate
                '-movflags', '+faststart',  # Optimización para web
                '-y',  # Sobrescribir archivo de salida
                output_path
            ]
            
            # Si es H.265, agregar optimizaciones adicionales
            if preset['codec'] == 'libx265':
                cmd.extend(['-x265-params', 'log-level=error'])
            
            self.log(f"🔧 Comando: {' '.join(cmd)}")
            self.log("⏳ Procesando...")
            
            # Ejecutar FFmpeg con captura de progreso
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                universal_newlines=True,
                bufsize=1
            )
            
            # Monitorear progreso
            while True:
                output = process.stderr.readline()
                if output == '' and process.poll() is not None:
                    break
                
                if output:
                    # Buscar información de progreso en la salida de FFmpeg
                    if 'time=' in output:
                        # Extraer tiempo actual y duración para calcular progreso
                        try:
                            time_part = output.split('time=')[1].split()[0]
                            # Convertir tiempo a segundos y calcular progreso
                            # (esto es una aproximación, FFmpeg no da progreso exacto)
                            if ':' in time_part:
                                parts = time_part.split(':')
                                if len(parts) == 3:
                                    hours, minutes, seconds = map(float, parts)
                                    current_time = hours * 3600 + minutes * 60 + seconds
                                    # Estimación de progreso (no es 100% preciso)
                                    progress = min(current_time * 2, 95)  # Estimación
                                    self.progress_var.set(progress)
                        except:
                            pass
                    
                    self.log(output.strip())
            
            # Verificar resultado
            return_code = process.poll()
            
            if return_code == 0:
                # Compresión exitosa
                self.progress_var.set(100)
                self.status_label.config(text="✅ Compresión completada exitosamente!", foreground="green")
                
                # Mostrar información del archivo comprimido
                if os.path.exists(output_path):
                    original_size = os.path.getsize(input_path) / (1024 * 1024)
                    compressed_size = os.path.getsize(output_path) / (1024 * 1024)
                    compression_ratio = (1 - compressed_size / original_size) * 100
                    
                    self.log(f"✅ Compresión exitosa!")
                    self.log(f"📊 Tamaño original: {original_size:.1f}MB")
                    self.log(f"📊 Tamaño comprimido: {compressed_size:.1f}MB")
                    self.log(f"📊 Reducción: {compression_ratio:.1f}%")
                    self.log(f"📁 Archivo guardado en: {output_path}")
                    
                    messagebox.showinfo("Éxito", 
                        f"Video comprimido exitosamente!\n\n"
                        f"Archivo original: {original_size:.1f}MB\n"
                        f"Archivo comprimido: {compressed_size:.1f}MB\n"
                        f"Reducción: {compression_ratio:.1f}%\n\n"
                        f"Guardado en: {output_path}")
                else:
                    self.log("❌ Error: Archivo de salida no encontrado")
                    self.status_label.config(text="❌ Error en la compresión", foreground="red")
            else:
                self.log(f"❌ Error en la compresión (código: {return_code})")
                self.status_label.config(text="❌ Error en la compresión", foreground="red")
                messagebox.showerror("Error", "Error durante la compresión del video")
        
        except Exception as e:
            self.log(f"❌ Error inesperado: {e}")
            self.status_label.config(text="❌ Error inesperado", foreground="red")
            messagebox.showerror("Error", f"Error inesperado: {e}")
        
        finally:
            # Rehabilitar botón
            self.compress_button.config(state='normal')
    
    def open_output_folder(self):
        """Abrir carpeta de salida en el explorador"""
        if self.output_folder.get():
            if os.name == 'nt':  # Windows
                os.startfile(self.output_folder.get())
            elif os.name == 'posix':  # macOS y Linux
                subprocess.run(['open' if sys.platform == 'darwin' else 'xdg-open', 
                              self.output_folder.get()])
        else:
            messagebox.showwarning("Advertencia", "No hay carpeta de salida seleccionada")
    
    def log(self, message):
        """Agregar mensaje al log"""
        self.log_text.insert(tk.END, f"{message}\n")
        self.log_text.see(tk.END)
        self.root.update_idletasks()

def main():
    root = tk.Tk()
    
    # Configurar estilo
    style = ttk.Style()
    style.theme_use('clam')
    
    # Crear aplicación
    app = VideoCompressor(root)
    
    # Centrar ventana
    root.update_idletasks()
    x = (root.winfo_screenwidth() // 2) - (root.winfo_width() // 2)
    y = (root.winfo_screenheight() // 2) - (root.winfo_height() // 2)
    root.geometry(f"+{x}+{y}")
    
    # Iniciar aplicación
    root.mainloop()

if __name__ == "__main__":
    import sys
    main()
