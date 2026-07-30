#!/usr/bin/env python3
"""
Script para crear una rúbrica por defecto en el sistema
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from datetime import datetime, timezone

load_dotenv('/app/backend/.env')

mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']

async def create_default_rubric():
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Check if default rubric exists
    existing = await db.rubrics.find_one({"is_default": True})
    if existing:
        print("✅ Ya existe una rúbrica por defecto")
        client.close()
        return
    
    # Create default rubric
    default_rubric = {
        "rubric_id": "rubric_default_001",
        "name": "Rúbrica Estándar AMED-IA",
        "description": "Rúbrica equilibrada para evaluación integral de competencias de enfermería",
        "competency_weights": {
            "comunicacion": 20.0,
            "valoracion_clinica": 20.0,
            "razonamiento_critico": 20.0,
            "competencia_tecnica": 20.0,
            "empatia": 20.0
        },
        "criteria": {
            "comunicacion": [
                "Utiliza lenguaje claro y apropiado",
                "Escucha activamente al paciente",
                "Proporciona información comprensible",
                "Mantiene comunicación efectiva con el equipo"
            ],
            "valoracion_clinica": [
                "Realiza valoración sistemática",
                "Identifica signos y síntomas relevantes",
                "Recopila información completa",
                "Documenta hallazgos adecuadamente"
            ],
            "razonamiento_critico": [
                "Analiza información de manera lógica",
                "Prioriza intervenciones apropiadamente",
                "Toma decisiones fundamentadas",
                "Evalúa resultados de intervenciones"
            ],
            "competencia_tecnica": [
                "Ejecuta procedimientos correctamente",
                "Aplica conocimientos técnicos",
                "Mantiene estándares de seguridad",
                "Demuestra destreza en habilidades prácticas"
            ],
            "empatia": [
                "Muestra sensibilidad hacia el paciente",
                "Respeta la dignidad y autonomía",
                "Establece relación terapéutica",
                "Brinda apoyo emocional apropiado"
            ]
        },
        "created_by": "system",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_default": True
    }
    
    await db.rubrics.insert_one(default_rubric)
    print("✅ Rúbrica por defecto creada exitosamente")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_default_rubric())
