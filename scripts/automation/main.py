#!/usr/bin/env python3
"""
ComunicaP Pictogramas Automation Suite
Tareas: Validación, Normalización, Generación de Secuencias, Análisis de Cobertura
"""

import os
import json
from datetime import datetime
from supabase import create_client, Client
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://lgpqyjevdwstbnerawmp.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "sb_secret_3S5RPLUCLOJWvT2FsodP7w_uTF3Y_A8")

# Inicializar cliente Supabase
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ==================== TAREA 1: VALIDACIÓN ====================

def tarea_1_validacion():
    """
    TAREA 1: Revisar integridad
    - Duplicados en etiqueta
    - Emoji coincida semánticamente con palabra
    - Errores ortográficos
    - Caracteres especiales problemáticos
    """
    print("\n🔍 TAREA 1: VALIDACIÓN DE INTEGRIDAD")
    print("=" * 50)
    
    try:
        # Obtener todos los pictogramas
        response = supabase.table("pictogramas").select("*").execute()
        pictogramas = response.data
        
        print(f"✓ Cargados {len(pictogramas)} pictogramas")
        
        # Detectar problemas
        problemas = {
            "duplicados": [],
            "caracteres_raros": [],
            "etiquetas_vacias": [],
            "emoji_duplicado": []
        }
        
        etiquetas_vistas = {}
        emojis_vistas = {}
        
        for picto in pictogramas:
            etiqueta = picto.get("etiqueta", "").strip()
            emoji = picto.get("emoji", "").strip()
            
            # Detectar etiquetas vacías
            if not etiqueta:
                problemas["etiquetas_vacias"].append(picto["id"])
                continue
            
            # Detectar duplicados
            if etiqueta.upper() in etiquetas_vistas:
                problemas["duplicados"].append({
                    "etiqueta": etiqueta,
                    "ids": [etiquetas_vistas[etiqueta.upper()], picto["id"]]
                })
            else:
                etiquetas_vistas[etiqueta.upper()] = picto["id"]
            
            # Detectar emoji duplicado
            if emoji in emojis_vistas and emojis_vistas[emoji] != etiqueta:
                problemas["emoji_duplicado"].append({
                    "emoji": emoji,
                    "etiquetas": [emojis_vistas[emoji], etiqueta]
                })
            else:
                emojis_vistas[emoji] = etiqueta
            
            # Detectar caracteres problemáticos
            caracteres_raros = [c for c in etiqueta if ord(c) > 127 and c not in "áéíóúñÁÉÍÓÚÑ"]
            if caracteres_raros:
                problemas["caracteres_raros"].append({
                    "etiqueta": etiqueta,
                    "caracteres": caracteres_raros
                })
        
        # Reporte
        print("\n📋 RESULTADOS:")
        print(f"  • Duplicados encontrados: {len(problemas['duplicados'])}")
        print(f"  • Caracteres raros: {len(problemas['caracteres_raros'])}")
        print(f"  • Etiquetas vacías: {len(problemas['etiquetas_vacias'])}")
        print(f"  • Emoji duplicado: {len(problemas['emoji_duplicado'])}")
        
        if problemas['duplicados']:
            print("\n⚠️  DUPLICADOS:")
            for dup in problemas['duplicados'][:5]:
                print(f"   - {dup['etiqueta']} (IDs: {dup['ids']})")
        
        return {
            "tarea": "validacion",
            "total_pictogramas": len(pictogramas),
            "problemas": problemas,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"❌ Error en Tarea 1: {str(e)}")
        return {"error": str(e)}


# ==================== TAREA 2: NORMALIZACIÓN ====================

def tarea_2_normalizacion():
    """
    TAREA 2: Normalizar texto
    - Convertir TODAS las etiquetas a MAYÚSCULAS
    - Remover espacios extra
    - Estandarizar formato
    """
    print("\n📝 TAREA 2: NORMALIZACIÓN DE TEXTO")
    print("=" * 50)
    
    try:
        response = supabase.table("pictogramas").select("*").execute()
        pictogramas = response.data
        
        actualizaciones = 0
        cambios = []
        
        for picto in pictogramas:
            etiqueta_original = picto.get("etiqueta", "").strip()
            etiqueta_normalizada = etiqueta_original.upper().strip()
            
            # Si hay cambios
            if etiqueta_original != etiqueta_normalizada:
                try:
                    supabase.table("pictogramas").update({
                        "etiqueta": etiqueta_normalizada
