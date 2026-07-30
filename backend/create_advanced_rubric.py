#!/usr/bin/env python3
"""
Script para crear la rúbrica estándar con niveles de logro por cuartiles
Basado en la especificación técnica del sistema AMED-IA
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from datetime import datetime, timezone

load_dotenv('/app/backend/.env')

mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']

async def create_advanced_rubric():
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Eliminar rúbrica por defecto anterior si existe
    await db.rubrics.delete_many({"is_default": True})
    
    # Definición de competencias con niveles de logro (cuartiles)
    competency_levels = {
        "comunicacion": {
            "name": "Comunicación",
            "description": "Capacidad para transmitir e intercambiar información de forma clara, precisa y adaptada al contexto del paciente, familiares o equipo médico, utilizando canales verbales y no verbales de manera efectiva.",
            "levels": {
                "nivel_1": {
                    "range": "0-25%",
                    "label": "Inicial / Deficiente",
                    "description": "Expresión confusa, usa tecnicismos innecesarios con el paciente o interrumpe constantemente. No escucha de forma activa."
                },
                "nivel_2": {
                    "range": "26-50%",
                    "label": "En Desarrollo / Aceptable",
                    "description": "Transmite la información básica, pero el mensaje suele ser unidireccional. Falta claridad en las instrucciones finales."
                },
                "nivel_3": {
                    "range": "51-75%",
                    "label": "Competente / Avanzado",
                    "description": "Se comunica con claridad, adapta el lenguaje al interlocutor, confirma la comprensión del mensaje y domina la comunicación no verbal."
                },
                "nivel_4": {
                    "range": "76-100%",
                    "label": "Excelente / Destacado",
                    "description": "Comunicación asertiva impecable en situaciones de alta presión. Facilita el diálogo interdisciplinario y maneja con éxito conflictos o malas noticias."
                }
            }
        },
        "valoracion_clinica": {
            "name": "Valoración Clínica",
            "description": "Habilidad para recopilar de manera sistemática y priorizada los datos del paciente (anamnesis, signos vitales, examen físico) para identificar el estado de salud o gravedad de la situación.",
            "levels": {
                "nivel_1": {
                    "range": "0-25%",
                    "label": "Inicial / Deficiente",
                    "description": "Omite datos críticos en la revisión inicial, no prioriza los signos de alarma y realiza la valoración sin un orden lógico."
                },
                "nivel_2": {
                    "range": "26-50%",
                    "label": "En Desarrollo / Aceptable",
                    "description": "Recopila los datos principales pero depende de guías visuales o asistencia constante. Puede pasar por alto sutilezas en el examen físico."
                },
                "nivel_3": {
                    "range": "51-75%",
                    "label": "Competente / Avanzado",
                    "description": "Realiza una valoración completa, sistemática y fluida. Identifica correctamente los problemas principales del paciente en tiempo y forma."
                },
                "nivel_4": {
                    "range": "76-100%",
                    "label": "Excelente / Destacado",
                    "description": "Valoración exhaustiva y ultra veloz, incluso en escenarios caóticos o con pacientes poco cooperativos. Detecta patrones de deterioro antes de que sean evidentes."
                }
            }
        },
        "razonamiento_critico": {
            "name": "Razonamiento Crítico",
            "description": "Proceso mental de análisis, síntesis y evaluación de la información clínica para tomar decisiones diagnósticas y terapéuticas fundamentadas en la evidencia, anticipando riesgos.",
            "levels": {
                "nivel_1": {
                    "range": "0-25%",
                    "label": "Inicial / Deficiente",
                    "description": "Toma decisiones de forma reactiva o impulsiva. No conecta los hallazgos clínicos con las patologías subyacentes."
                },
                "nivel_2": {
                    "range": "26-50%",
                    "label": "En Desarrollo / Aceptable",
                    "description": "Aplica algoritmos estándar de memoria, pero se bloquea o duda si el paciente presenta una evolución atípica o fuera del manual."
                },
                "nivel_3": {
                    "range": "51-75%",
                    "label": "Competente / Avanzado",
                    "description": "Analiza variables en conjunto, contrasta hipótesis diagnósticas correctas y justifica sus decisiones basándose en la condición del paciente."
                },
                "nivel_4": {
                    "range": "76-100%",
                    "label": "Excelente / Destacado",
                    "description": "Resolución experta de casos complejos o comorbilidades. Anticipa complicaciones potenciales y ajusta el plan de acción en tiempo real con alta precisión."
                }
            }
        },
        "competencia_tecnica": {
            "name": "Competencia Técnica",
            "description": "Destreza en la ejecución de procedimientos, maniobras clínicas e instrumentales y uso de tecnología médica, siguiendo los protocolos de seguridad y esterilidad vigentes.",
            "levels": {
                "nivel_1": {
                    "range": "0-25%",
                    "label": "Inicial / Deficiente",
                    "description": "Ejecuta los procedimientos con inseguridad, comete errores técnicos frecuentes o vulnera normas de bioseguridad."
                },
                "nivel_2": {
                    "range": "26-50%",
                    "label": "En Desarrollo / Aceptable",
                    "description": "Conoce los pasos del procedimiento y lo logra completar, pero muestra falta de fluidez, lentitud o requiere supervisión directa."
                },
                "nivel_3": {
                    "range": "51-75%",
                    "label": "Competente / Avanzado",
                    "description": "Realiza las técnicas con seguridad, destreza y de forma autónoma, respetando estrictamente los protocolos de seguridad del paciente."
                },
                "nivel_4": {
                    "range": "76-100%",
                    "label": "Excelente / Destacado",
                    "description": "Maestría técnica excepcional. Capacidad para resolver complicaciones técnicas imprevistas sobre la marcha y adaptar el procedimiento a la anatomía del paciente."
                }
            }
        },
        "empatia": {
            "name": "Empatía y Relación Terapéutica",
            "description": "Capacidad para comprender la perspectiva del paciente, validar sus emociones y establecer un vínculo de confianza, respeto y colaboración mutua durante el acto asistencial.",
            "levels": {
                "nivel_1": {
                    "range": "0-25%",
                    "label": "Inicial / Deficiente",
                    "description": "Muestra indiferencia, frialdad o actitud netamente mecánica hacia el sufrimiento o preocupaciones del paciente."
                },
                "nivel_2": {
                    "range": "26-50%",
                    "label": "En Desarrollo / Aceptable",
                    "description": "Trata al paciente con respeto básico y educación, pero no profundiza en sus necesidades emocionales, temores o expectativas."
                },
                "nivel_3": {
                    "range": "51-75%",
                    "label": "Competente / Avanzado",
                    "description": "Demuestra empatía activa, valida las emociones del paciente, mitiga su ansiedad y lo involucra activamente en sus decisiones de cuidado."
                },
                "nivel_4": {
                    "range": "76-100%",
                    "label": "Excelente / Destacado",
                    "description": "Conexión humana profunda que transforma la experiencia del paciente. Logra calmar situaciones de pánico o agresividad extrema infundiendo absoluta seguridad."
                }
            }
        }
    }
    
    # Crear rúbrica por defecto con estructura avanzada
    advanced_rubric = {
        "rubric_id": "rubric_advanced_001",
        "name": "Rúbrica Estándar AMED-IA (Niveles de Logro)",
        "description": "Rúbrica con 4 niveles de logro por competencia basados en cuartiles (25% cada nivel). Sistema de evaluación estructurado para competencias de enfermería.",
        "competency_weights": {
            "comunicacion": 20.0,
            "valoracion_clinica": 20.0,
            "razonamiento_critico": 20.0,
            "competencia_tecnica": 20.0,
            "empatia": 20.0
        },
        "competency_levels": competency_levels,
        "created_by": "system",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_default": True
    }
    
    await db.rubrics.insert_one(advanced_rubric)
    print("✅ Rúbrica avanzada con niveles de logro creada exitosamente")
    print(f"   • 5 competencias definidas")
    print(f"   • 4 niveles de logro por competencia (cuartiles)")
    print(f"   • Total: 20 descriptores de desempeño")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_advanced_rubric())
