#!/usr/bin/env python3
"""
Script para poblar la base de datos con 33 casos clínicos de enfermería
Incluye casos de diversas especialidades y niveles de dificultad
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from datetime import datetime, timezone
import uuid

load_dotenv('/app/backend/.env')

mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']

async def seed_cases():
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Limpiar colección de casos existentes (solo para re-seed)
    await db.clinical_cases.delete_many({})
    
    cases = []
    
    # ========== CASOS DE ENFERMERÍA CLÍNICA ==========
    
    # Caso 1: Adulto mayor con ICC
    cases.append({
        "case_id": "case_enf_clinic001",
        "title": "Paciente con Insuficiencia Cardíaca Congestiva",
        "specialty": "Enfermería Clínica",
        "difficulty": "medio",
        "scenario": "Don Manuel Herrera, 72 años, ingresa al servicio de urgencias con disnea severa y edema en miembros inferiores. Antecedentes de hipertensión arterial no controlada. Se encuentra ansioso y con dificultad respiratoria en reposo.",
        "instructions": "Evalúa al paciente aplicando el proceso de enfermería. Identifica signos de alarma, realiza la valoración cardiovascular completa, prioriza intervenciones y establece comunicación efectiva con el equipo interdisciplinario.",
        "patient_profile": {
            "name": "Don Manuel Herrera",
            "age": 72,
            "gender": "Masculino",
            "chief_complaint": "Dificultad para respirar y hinchazón en las piernas",
            "vital_signs": {
                "hr": 102,
                "bp": "170/95",
                "temp": 36.8,
                "rr": 28,
                "spo2": 88
            },
            "medical_history": ["Hipertensión arterial", "Tabaquismo (20 años)", "Diabetes tipo 2"],
            "current_medications": ["Enalapril 10mg", "Metformina 850mg"],
            "allergies": "Ninguna conocida"
        },
        "learning_objectives": [
            "Realizar valoración cardiovascular y respiratoria completa",
            "Identificar signos y síntomas de insuficiencia cardíaca",
            "Priorizar intervenciones de enfermería en situaciones de urgencia",
            "Comunicarse efectivamente con el equipo interdisciplinario"
        ],
        "simulation_type": "equipo_interdisciplinario",
        "team_members": [
            {
                "role": "paciente",
                "name": "Don Manuel Herrera",
                "specialty": "Paciente",
                "description": "Adulto mayor con ICC, ansioso y con disnea"
            },
            {
                "role": "medico",
                "name": "Dr. Roberto Sánchez",
                "specialty": "Cardiólogo",
                "description": "Especialista en cardiología, supervisa el tratamiento médico"
            },
            {
                "role": "enfermera_senior",
                "name": "Enfermera Laura Méndez",
                "specialty": "Enfermera Coordinadora",
                "description": "Enfermera con experiencia en UCI, guía y supervisa"
            }
        ],
        "created_by": "system",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Caso 2: Post-operatorio inmediato
    cases.append({
        "case_id": "case_enf_clinic002",
        "title": "Cuidados Post-operatorios: Colecistectomía",
        "specialty": "Enfermería Quirúrgica",
        "difficulty": "fácil",
        "scenario": "María Elena Torres, 45 años, regresa de sala de operaciones tras colecistectomía laparoscópica. Se encuentra somnolienta, con dolor moderado en sitios de punción. Debe recibir cuidados post-anestésicos y manejo del dolor.",
        "instructions": "Realiza la valoración post-operatoria inmediata. Evalúa nivel de consciencia, signos vitales, apósitos quirúrgicos y nivel de dolor. Implementa medidas de confort y prevención de complicaciones.",
        "patient_profile": {
            "name": "María Elena Torres",
            "age": 45,
            "gender": "Femenino",
            "chief_complaint": "Post-operatorio inmediato de colecistectomía",
            "vital_signs": {
                "hr": 88,
                "bp": "125/78",
                "temp": 36.4,
                "rr": 16,
                "spo2": 96
            },
            "medical_history": ["Colelitiasis", "Sobrepeso (IMC 28)"],
            "current_medications": ["Tramadol PRN", "Metamizol IV"],
            "allergies": "Penicilina"
        },
        "learning_objectives": [
            "Realizar valoración post-operatoria sistemática",
            "Evaluar y manejar el dolor post-quirúrgico",
            "Identificar signos de complicaciones tempranas",
            "Educar al paciente sobre cuidados en el hogar"
        ],
        "simulation_type": "individual",
        "created_by": "system",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Caso 3: Diabetes descompensada
    cases.append({
        "case_id": "case_enf_clinic003",
        "title": "Crisis Hiperglucémica en Diabetes Tipo 1",
        "specialty": "Enfermería Clínica",
        "difficulty": "difícil",
        "scenario": "Joven de 22 años con diabetes tipo 1 llega a urgencias con glucemia de 450 mg/dl, náuseas, vómitos y confusión. Refiere haber suspendido insulina por 2 días debido a infección respiratoria.",
        "instructions": "Evalúa el estado metabólico del paciente. Identifica signos de cetoacidosis diabética. Prioriza intervenciones inmediatas y monitoriza respuesta al tratamiento. Educa sobre prevención de crisis futuras.",
        "patient_profile": {
            "name": "Carlos Ramírez",
            "age": 22,
            "gender": "Masculino",
            "chief_complaint": "Náuseas, vómitos y confusión",
            "vital_signs": {
                "hr": 118,
                "bp": "95/60",
                "temp": 37.8,
                "rr": 24,
                "spo2": 94
            },
            "medical_history": ["Diabetes tipo 1 (diagnóstico hace 5 años)"],
            "current_medications": ["Insulina glargina 20 UI/día", "Insulina rápida según esquema"],
            "allergies": "Ninguna conocida"
        },
        "learning_objectives": [
            "Identificar signos y síntomas de cetoacidosis diabética",
            "Priorizar intervenciones en emergencias metabólicas",
            "Monitorizar respuesta al tratamiento",
            "Educar sobre adherencia terapéutica"
        ],
        "simulation_type": "equipo_interdisciplinario",
        "team_members": [
            {
                "role": "paciente",
                "name": "Carlos Ramírez",
                "specialty": "Paciente",
                "description": "Joven con diabetes tipo 1 en crisis hiperglucémica"
            },
            {
                "role": "medico",
                "name": "Dra. Patricia Gómez",
                "specialty": "Endocrinóloga",
                "description": "Especialista en diabetes, ajusta tratamiento"
            },
            {
                "role": "nutricionista",
                "name": "Lic. Ana Martínez",
                "specialty": "Nutricionista Clínica",
                "description": "Asesora en plan nutricional y educación alimentaria"
            }
        ],
        "created_by": "system",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # ========== CASOS DE ENFERMERÍA PEDIÁTRICA ==========
    
    # Caso 4: Bronquiolitis en lactante
    cases.append({
        "case_id": "case_enf_ped001",
        "title": "Lactante con Bronquiolitis Aguda",
        "specialty": "Enfermería Pediátrica",
        "difficulty": "medio",
        "scenario": "Lactante de 6 meses con dificultad respiratoria, tos y fiebre de 3 días de evolución. Madre refiere que rechaza alimentos y presenta tiraje intercostal. Diagnóstico de bronquiolitis por VSR.",
        "instructions": "Evalúa el estado respiratorio del lactante. Identifica signos de dificultad respiratoria. Implementa cuidados de enfermería pediátricos y educa a la madre sobre el manejo en casa.",
        "patient_profile": {
            "name": "Bebé Sofía Castillo",
            "age": 0.5,
            "gender": "Femenino",
            "chief_complaint": "Dificultad respiratoria y rechazo del alimento",
            "vital_signs": {
                "hr": 155,
                "bp": "85/50",
                "temp": 38.2,
                "rr": 55,
                "spo2": 91
            },
            "medical_history": ["Nacimiento a término", "Lactancia materna exclusiva"],
            "current_medications": ["Ninguna"],
            "allergies": "Ninguna conocida"
        },
        "learning_objectives": [
            "Realizar valoración respiratoria en pediatría",
            "Identificar signos de dificultad respiratoria en lactantes",
            "Implementar cuidados de enfermería pediátricos",
            "Educar a padres sobre cuidados en el hogar"
        ],
        "simulation_type": "equipo_interdisciplinario",
        "team_members": [
            {
                "role": "madre",
                "name": "Sra. Ana Castillo",
                "specialty": "Madre del paciente",
                "description": "Madre primeriza, ansiosa por el estado de su bebé"
            },
            {
                "role": "pediatra",
                "name": "Dr. Luis Fernández",
                "specialty": "Pediatra",
                "description": "Especialista en enfermedades respiratorias pediátricas"
            },
            {
                "role": "kinesiologo",
                "name": "Lic. Mario Torres",
                "specialty": "Kinesiólogo Respiratorio",
                "description": "Realiza terapia respiratoria en pediatría"
            }
        ],
        "created_by": "system",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Caso 5: Gastroenteritis pediátrica
    cases.append({
        "case_id": "case_enf_ped002",
        "title": "Niño con Deshidratación por Gastroenteritis",
        "specialty": "Enfermería Pediátrica",
        "difficulty": "fácil",
        "scenario": "Niño de 3 años con vómitos y diarrea líquida desde hace 24 horas. Madre refiere que ha tenido más de 8 evacuaciones. Presenta signos de deshidratación leve a moderada.",
        "instructions": "Evalúa el grado de deshidratación. Calcula requerimientos de líquidos. Inicia plan de rehidratación y educa a la madre sobre signos de alarma.",
        "patient_profile": {
            "name": "Santiago Morales",
            "age": 3,
            "gender": "Masculino",
            "chief_complaint": "Vómitos y diarrea",
            "vital_signs": {
                "hr": 128,
                "bp": "90/55",
                "temp": 37.5,
                "rr": 28,
                "spo2": 97
            },
            "medical_history": ["Esquema de vacunación completo"],
            "current_medications": ["Ninguna"],
            "allergies": "Ninguna conocida"
        },
        "learning_objectives": [
            "Evaluar grado de deshidratación en pediatría",
            "Calcular requerimientos hídricos pediátricos",
            "Implementar plan de rehidratación",
            "Educar sobre prevención de deshidratación"
        ],
        "simulation_type": "individual",
        "created_by": "system",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # ========== CASOS DE ENFERMERÍA MATERNO-INFANTIL ==========
    
    # Caso 6: Trabajo de parto activo
    cases.append({
        "case_id": "case_enf_mat001",
        "title": "Mujer en Trabajo de Parto Activo",
        "specialty": "Enfermería Materno-Infantil",
        "difficulty": "medio",
        "scenario": "Gestante de 39 semanas en trabajo de parto activo. Contracciones cada 3 minutos. Dilatación de 6 cm. Refiere dolor intenso y solicita analgesia. Monitoreo fetal reactivo.",
        "instructions": "Evalúa la progresión del trabajo de parto. Monitoriza bienestar materno-fetal. Implementa medidas de confort y apoyo. Identifica signos de alarma obstétrica.",
        "patient_profile": {
            "name": "Laura Vázquez",
            "age": 28,
            "gender": "Femenino",
            "chief_complaint": "Contracciones dolorosas",
            "vital_signs": {
                "hr": 92,
                "bp": "118/72",
                "temp": 36.9,
                "rr": 20,
                "spo2": 98
            },
            "medical_history": ["Primigesta", "Embarazo de bajo riesgo", "Control prenatal completo"],
            "current_medications": ["Suplemento de hierro", "Ácido fólico"],
            "allergies": "Ninguna conocida"
        },
        "learning_objectives": [
            "Evaluar progresión del trabajo de parto",
            "Interpretar monitoreo fetal",
            "Implementar medidas de confort no farmacológicas",
            "Identificar signos de alarma obstétrica"
        ],
        "simulation_type": "equipo_interdisciplinario",
        "team_members": [
            {
                "role": "paciente",
                "name": "Laura Vázquez",
                "specialty": "Gestante",
                "description": "Primigesta en trabajo de parto activo"
            },
            {
                "role": "obstetra",
                "name": "Dra. Silvia Rojas",
                "specialty": "Obstetra",
                "description": "Supervisa el trabajo de parto y toma decisiones médicas"
            },
            {
                "role": "matrona",
                "name": "Matrona Carmen López",
                "specialty": "Matrona",
                "description": "Especialista en atención del parto normal"
            }
        ],
        "created_by": "system",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Caso 7: Post-parto con lactancia
    cases.append({
        "case_id": "case_enf_mat002",
        "title": "Puérpera con Dificultades en la Lactancia",
        "specialty": "Enfermería Materno-Infantil",
        "difficulty": "fácil",
        "scenario": "Puérpera de 24 horas post-parto vaginal. Refiere dolor en pezones y dificultad para el agarre del recién nacido. Primípara con ansiedad sobre lactancia materna.",
        "instructions": "Evalúa la técnica de lactancia. Identifica problemas en el agarre. Educa sobre posiciones y técnicas. Brinda apoyo emocional y fortalece confianza materna.",
        "patient_profile": {
            "name": "Daniela Ortiz",
            "age": 26,
            "gender": "Femenino",
            "chief_complaint": "Dolor al amamantar",
            "vital_signs": {
                "hr": 78,
                "bp": "115/70",
                "temp": 36.8,
                "rr": 16,
                "spo2": 98
            },
            "medical_history": ["Primípara", "Parto vaginal sin complicaciones"],
            "current_medications": ["Paracetamol PRN", "Hierro oral"],
            "allergies": "Ninguna conocida"
        },
        "learning_objectives": [
            "Evaluar técnica de lactancia materna",
            "Identificar y corregir problemas de agarre",
            "Educar sobre posiciones de amamantamiento",
            "Brindar apoyo emocional a madres primerizas"
        ],
        "simulation_type": "individual",
        "created_by": "system",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # ========== CASOS DE ENFERMERÍA EN SALUD MENTAL ==========
    
    # Caso 8: Crisis de ansiedad
    cases.append({
        "case_id": "case_enf_mental001",
        "title": "Paciente con Crisis de Ansiedad",
        "specialty": "Enfermería en Salud Mental",
        "difficulty": "medio",
        "scenario": "Mujer de 32 años llega a urgencias con sensación de muerte inminente, palpitaciones, temblor y dificultad para respirar. Refiere que estos episodios han aumentado en frecuencia el último mes.",
        "instructions": "Evalúa el estado mental del paciente. Implementa técnicas de contención y manejo de crisis. Establece comunicación terapéutica. Identifica factores desencadenantes.",
        "patient_profile": {
            "name": "Patricia Delgado",
            "age": 32,
            "gender": "Femenino",
            "chief_complaint": "Sensación de muerte, palpitaciones y falta de aire",
            "vital_signs": {
                "hr": 125,
                "bp": "145/90",
                "temp": 36.7,
                "rr": 32,
                "spo2": 98
            },
            "medical_history": ["Trastorno de ansiedad generalizada (diagnóstico previo)"],
            "current_medications": ["Sertralina 50mg"],
            "allergies": "Ninguna conocida"
        },
        "learning_objectives": [
            "Realizar valoración del estado mental",
            "Implementar técnicas de manejo de crisis",
            "Establecer comunicación terapéutica",
            "Identificar factores desencadenantes de ansiedad"
        ],
        "simulation_type": "equipo_interdisciplinario",
        "team_members": [
            {
                "role": "paciente",
                "name": "Patricia Delgado",
                "specialty": "Paciente",
                "description": "Mujer con crisis de ansiedad aguda"
            },
            {
                "role": "psiquiatra",
                "name": "Dr. Fernando Ríos",
                "specialty": "Psiquiatra",
                "description": "Especialista en trastornos de ansiedad"
            },
            {
                "role": "psicologo",
                "name": "Lic. Mónica Herrera",
                "specialty": "Psicóloga Clínica",
                "description": "Realiza intervención psicológica en crisis"
            }
        ],
        "created_by": "system",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Caso 9: Depresión con ideación suicida
    cases.append({
        "case_id": "case_enf_mental002",
        "title": "Paciente con Depresión e Ideación Suicida",
        "specialty": "Enfermería en Salud Mental",
        "difficulty": "difícil",
        "scenario": "Hombre de 45 años traído por familiares debido a ideas de muerte. Refiere sentirse sin esperanza, con insomnio y pérdida de interés en actividades. Ha expresado deseos de 'terminar con todo'.",
        "instructions": "Evalúa el riesgo suicida. Implementa medidas de seguridad. Establece vínculo terapéutico. Coordina con equipo de salud mental para plan de intervención inmediata.",
        "patient_profile": {
            "name": "Roberto Jiménez",
            "age": 45,
            "gender": "Masculino",
            "chief_complaint": "Ideas de muerte y desesperanza",
            "vital_signs": {
                "hr": 72,
                "bp": "110/70",
                "temp": 36.5,
                "rr": 16,
                "spo2": 97
            },
            "medical_history": ["Depresión mayor (episodio anterior hace 2 años)", "Divorcio reciente"],
            "current_medications": ["Abandonó fluoxetina hace 3 meses"],
            "allergies": "Ninguna conocida"
        },
        "learning_objectives": [
            "Evaluar riesgo suicida de forma sistemática",
            "Implementar medidas de seguridad inmediatas",
            "Establecer comunicación terapéutica en crisis",
            "Coordinar con equipo interdisciplinario en salud mental"
        ],
        "simulation_type": "equipo_interdisciplinario",
        "team_members": [
            {
                "role": "paciente",
                "name": "Roberto Jiménez",
                "specialty": "Paciente",
                "description": "Hombre con depresión severa e ideación suicida"
            },
            {
                "role": "psiquiatra",
                "name": "Dra. Isabel Moreno",
                "specialty": "Psiquiatra",
                "description": "Evalúa y determina plan de tratamiento"
            },
            {
                "role": "trabajador_social",
                "name": "Lic. Juan Pérez",
                "specialty": "Trabajador Social",
                "description": "Evalúa red de apoyo y factores sociales"
            }
        ],
        "created_by": "system",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # ========== MÁS CASOS CLÍNICOS ==========
    
    # Caso 10: Neumonía en adulto
    cases.append({
        "case_id": "case_enf_clinic004",
        "title": "Adulto con Neumonía Adquirida en la Comunidad",
        "specialty": "Enfermería Clínica",
        "difficulty": "medio",
        "scenario": "Mujer de 55 años con fiebre alta, tos productiva y dolor torácico de 4 días de evolución. Radiografía muestra infiltrado en lóbulo inferior derecho. Se indica hospitalización e inicio de antibioticoterapia.",
        "instructions": "Realiza valoración respiratoria completa. Implementa cuidados de enfermería para paciente con neumonía. Monitoriza respuesta al tratamiento y previene complicaciones.",
        "patient_profile": {
            "name": "Gloria Muñoz",
            "age": 55,
            "gender": "Femenino",
            "chief_complaint": "Fiebre, tos y dolor al respirar",
            "vital_signs": {
                "hr": 105,
                "bp": "130/85",
                "temp": 39.1,
                "rr": 26,
                "spo2": 90
            },
            "medical_history": ["Tabaquismo activo (30 años)", "Hipertensión arterial controlada"],
            "current_medications": ["Losartán 50mg"],
            "allergies": "Ninguna conocida"
        },
        "learning_objectives": [
            "Realizar valoración respiratoria sistemática",
            "Implementar cuidados en pacientes con infección respiratoria",
            "Administrar terapia de oxígeno de forma segura",
            "Educar sobre prevención de neumonías"
        ],
        "simulation_type": "individual",
        "created_by": "system",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Caso 11: ACV isquémico
    cases.append({
        "case_id": "case_enf_clinic005",
        "title": "Paciente con Accidente Cerebrovascular Isquémico",
        "specialty": "Enfermería Neurológica",
        "difficulty": "difícil",
        "scenario": "Hombre de 68 años llega a urgencias con hemiparesia derecha y dificultad para hablar de inicio súbito hace 2 horas. Familiar refiere que estaba bien hasta que súbitamente presentó estos síntomas.",
        "instructions": "Aplica escala de valoración neurológica. Identifica ventana terapéutica. Prepara para tomografía urgente. Implementa protocolo de ACV isquémico.",
        "patient_profile": {
            "name": "Eduardo Salinas",
            "age": 68,
            "gender": "Masculino",
            "chief_complaint": "Debilidad en lado derecho y dificultad para hablar",
            "vital_signs": {
                "hr": 88,
                "bp": "180/105",
                "temp": 36.6,
                "rr": 18,
                "spo2": 96
            },
            "medical_history": ["Hipertensión arterial", "Dislipidemia", "Fibrilación auricular"],
            "current_medications": ["Atenolol 50mg", "Atorvastatina 40mg"],
            "allergies": "Ninguna conocida"
        },
        "learning_objectives": [
            "Aplicar escalas de valoración neurológica (NIHSS)",
            "Identificar ventana terapéutica en ACV",
            "Implementar protocolo de código ACV",
            "Prevenir complicaciones neurológicas"
        ],
        "simulation_type": "equipo_interdisciplinario",
        "team_members": [
            {
                "role": "paciente",
                "name": "Eduardo Salinas",
                "specialty": "Paciente",
                "description": "Adulto mayor con ACV isquémico agudo"
            },
            {
                "role": "neurologo",
                "name": "Dr. Andrés Vega",
                "specialty": "Neurólogo",
                "description": "Especialista en enfermedades cerebrovasculares"
            },
            {
                "role": "kinesiologo",
                "name": "Lic. Claudia Rojas",
                "specialty": "Kinesióloga Neurológica",
                "description": "Inicia rehabilitación temprana"
            }
        ],
        "created_by": "system",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Caso 12: Crisis asmática
    cases.append({
        "case_id": "case_enf_clinic006",
        "title": "Crisis Asmática Severa",
        "specialty": "Enfermería de Urgencias",
        "difficulty": "difícil",
        "scenario": "Adolescente de 16 años llega con disnea severa, sibilancias audibles y uso de musculatura accesoria. Refiere exacerbación tras exposición a polvo. No responde completamente a nebulizaciones en domicilio.",
        "instructions": "Evalúa severidad de la crisis asmática. Implementa manejo inicial de emergencia. Administra tratamiento broncodilatador. Monitoriza respuesta y previene deterioro.",
        "patient_profile": {
            "name": "Camila Soto",
            "age": 16,
            "gender": "Femenino",
            "chief_complaint": "Falta de aire severa",
            "vital_signs": {
                "hr": 132,
                "bp": "110/65",
                "temp": 36.8,
                "rr": 38,
                "spo2": 87
            },
            "medical_history": ["Asma bronquial desde los 8 años", "Alergias ambientales"],
            "current_medications": ["Salbutamol inhalado PRN", "Budesonida inhalada diaria"],
            "allergies": "Polen, ácaros del polvo"
        },
        "learning_objectives": [
            "Evaluar severidad de crisis asmática",
            "Administrar tratamiento broncodilatador",
            "Monitorizar respuesta al tratamiento",
            "Educar sobre prevención y manejo del asma"
        ],
        "simulation_type": "individual",
        "created_by": "system",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Caso 13: Quemaduras
    cases.append({
        "case_id": "case_enf_clinic007",
        "title": "Paciente con Quemaduras de Segundo Grado",
        "specialty": "Enfermería de Urgencias",
        "difficulty": "medio",
        "scenario": "Joven de 24 años sufre quemaduras en antebrazo y mano derecha tras accidente con aceite caliente. Presenta ampollas y eritema. Superficie corporal quemada aproximadamente 5%. Dolor intenso.",
        "instructions": "Evalúa extensión y profundidad de quemaduras. Implementa primeros cuidados. Maneja el dolor. Previene infección. Educa sobre cuidados posteriores.",
        "patient_profile": {
            "name": "Miguel Ángel Vargas",
            "age": 24,
            "gender": "Masculino",
            "chief_complaint": "Quemaduras en brazo y mano",
            "vital_signs": {
                "hr": 98,
                "bp": "125/78",
                "temp": 36.9,
                "rr": 20,
                "spo2": 98
            },
            "medical_history": ["Ninguno relevante"],
            "current_medications": ["Ninguna"],
            "allergies": "Ninguna conocida"
        },
        "learning_objectives": [
            "Evaluar extensión y profundidad de quemaduras",
            "Implementar primeros cuidados en quemaduras",
            "Manejar el dolor en pacientes quemados",
            "Prevenir infección en heridas por quemaduras"
        ],
        "simulation_type": "individual",
        "created_by": "system",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Caso 14: Sepsis
    cases.append({
        "case_id": "case_enf_clinic008",
        "title": "Paciente con Sepsis Severa",
        "specialty": "Enfermería de Cuidados Críticos",
        "difficulty": "difícil",
        "scenario": "Mujer de 62 años con infección urinaria evoluciona con fiebre alta, taquicardia, hipotensión y confusión. Sospecha de sepsis. Requiere estabilización urgente e inicio de antibióticos de amplio espectro.",
        "instructions": "Identifica signos de sepsis. Implementa protocolo de sepsis severa. Monitoriza perfusión tisular. Administra tratamiento según protocolo. Previene falla multiorgánica.",
        "patient_profile": {
            "name": "Rosa Campos",
            "age": 62,
            "gender": "Femenino",
            "chief_complaint": "Fiebre alta y confusión",
            "vital_signs": {
                "hr": 125,
                "bp": "85/50",
                "temp": 39.5,
                "rr": 28,
                "spo2": 92
            },
            "medical_history": ["Diabetes tipo 2", "Infecciones urinarias recurrentes"],
            "current_medications": ["Metformina 850mg"],
            "allergies": "Sulfonamidas"
        },
        "learning_objectives": [
            "Identificar criterios de sepsis severa",
            "Implementar protocolo de manejo de sepsis",
            "Monitorizar perfusión tisular",
            "Administrar reanimación con líquidos"
        ],
        "simulation_type": "equipo_interdisciplinario",
        "team_members": [
            {
                "role": "paciente",
                "name": "Rosa Campos",
                "specialty": "Paciente",
                "description": "Mujer con sepsis severa secundaria a infección urinaria"
            },
            {
                "role": "intensivista",
                "name": "Dr. Carlos Mendoza",
                "specialty": "Médico Intensivista",
                "description": "Especialista en cuidados críticos"
            },
            {
                "role": "farmaceutico",
                "name": "Q.F. Sandra Torres",
                "specialty": "Farmacéutica Clínica",
                "description": "Asesora en antibioticoterapia"
            }
        ],
        "created_by": "system",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # ========== CASOS DE ENFERMERÍA COMUNITARIA ==========
    
    # Caso 15: Control de salud infantil
    cases.append({
        "case_id": "case_enf_comu001",
        "title": "Control de Salud del Niño Sano - 12 Meses",
        "specialty": "Enfermería Comunitaria",
        "difficulty": "fácil",
        "scenario": "Niño de 12 meses asiste a control de salud en centro comunitario. Madre consulta sobre alimentación complementaria, desarrollo psicomotor y próximas vacunas. El niño presenta peso y talla adecuados para su edad.",
        "instructions": "Realiza evaluación del desarrollo infantil. Revisa esquema de vacunación. Educa sobre alimentación complementaria. Promueve prácticas de crianza saludable.",
        "patient_profile": {
            "name": "Mateo Silva",
            "age": 1,
            "gender": "Masculino",
            "chief_complaint": "Control de salud rutinario",
            "vital_signs": {
                "hr": 110,
                "bp": "N/A",
                "temp": 36.7,
                "rr": 28,
                "spo2": 99
            },
            "medical_history": ["Nacimiento a término", "Desarrollo psicomotor normal"],
            "current_medications": ["Ninguna"],
            "allergies": "Ninguna conocida"
        },
        "learning_objectives": [
            "Evaluar desarrollo infantil según edad",
            "Promover lactancia materna y alimentación complementaria",
            "Educar sobre estimulación temprana",
            "Fortalecer vínculo madre-hijo"
        ],
        "simulation_type": "individual",
        "created_by": "system",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Caso 16: Control prenatal
    cases.append({
        "case_id": "case_enf_comu002",
        "title": "Control Prenatal - Segundo Trimestre",
        "specialty": "Enfermería Comunitaria",
        "difficulty": "fácil",
        "scenario": "Gestante de 24 semanas acude a control prenatal en centro de salud comunitario. Refiere sentir movimientos fetales. Consulta sobre alimentación en el embarazo y preparación para el parto.",
        "instructions": "Realiza control prenatal completo. Evalúa crecimiento fetal. Educa sobre signos de alarma. Promueve parto humanizado y lactancia materna.",
        "patient_profile": {
            "name": "Andrea Fuentes",
            "age": 30,
            "gender": "Femenino",
            "chief_complaint": "Control prenatal rutinario",
            "vital_signs": {
                "hr": 82,
                "bp": "110/70",
                "temp": 36.6,
                "rr": 18,
                "spo2": 98
            },
            "medical_history": ["Secundigesta", "Parto anterior vaginal sin complicaciones"],
            "current_medications": ["Ácido fólico", "Hierro con vitamina C"],
            "allergies": "Ninguna conocida"
        },
        "learning_objectives": [
            "Realizar control prenatal completo",
            "Evaluar bienestar materno-fetal",
            "Educar sobre signos de alarma obstétrica",
            "Promover prácticas de autocuidado en el embarazo"
        ],
        "simulation_type": "individual",
        "created_by": "system",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Caso 17: Adulto mayor con hipertensión
    cases.append({
        "case_id": "case_enf_comu003",
        "title": "Control de Salud del Adulto Mayor - Hipertensión",
        "specialty": "Enfermería Comunitaria",
        "difficulty": "medio",
        "scenario": "Adulto mayor de 70 años en control por hipertensión arterial en policlínico comunitario. Refiere olvidos frecuentes en toma de medicamentos. Presión arterial: 165/95 mmHg. Vive solo.",
        "instructions": "Evalúa adherencia al tratamiento. Identifica barreras para el autocuidado. Implementa estrategias para mejorar adherencia. Evalúa red de apoyo social.",
        "patient_profile": {
            "name": "Don Julio Ramírez",
            "age": 70,
            "gender": "Masculino",
            "chief_complaint": "Control de presión arterial",
            "vital_signs": {
                "hr": 78,
                "bp": "165/95",
                "temp": 36.5,
                "rr": 16,
                "spo2": 96
            },
            "medical_history": ["Hipertensión arterial (10 años)", "Artrosis de rodillas"],
            "current_medications": ["Enalapril 10mg", "Hidroclorotiazida 25mg"],
            "allergies": "Ninguna conocida"
        },
        "learning_objectives": [
            "Evaluar adherencia al tratamiento farmacológico",
            "Identificar factores que afectan el autocuidado",
            "Implementar estrategias de educación en adulto mayor",
            "Evaluar red de apoyo social"
        ],
        "simulation_type": "individual",
        "created_by": "system",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Caso 18: Paciente con diabetes en comunidad
    cases.append({
        "case_id": "case_enf_comu004",
        "title": "Control de Diabetes en Atención Primaria",
        "specialty": "Enfermería Comunitaria",
        "difficulty": "medio",
        "scenario": "Mujer de 58 años con diabetes tipo 2 asiste a control en centro de salud. Glucemia en ayunas: 180 mg/dl. HbA1c: 8.5%. Refiere dificultad para seguir dieta y realizar ejercicio. IMC: 32.",
        "instructions": "Evalúa control metabólico. Identifica barreras para adherencia. Educa sobre automonitoreo y alimentación saludable. Motiva cambios de estilo de vida.",
        "patient_profile": {
            "name": "Marta Jiménez",
            "age": 58,
            "gender": "Femenino",
            "chief_complaint": "Control de diabetes",
            "vital_signs": {
                "hr": 80,
                "bp": "135/85",
                "temp": 36.6,
                "rr": 16,
                "spo2": 97
            },
            "medical_history": ["Diabetes tipo 2 (5 años)", "Obesidad", "Sedentarismo"],
            "current_medications": ["Metformina 850mg BID", "Glibenclamida 5mg"],
            "allergies": "Ninguna conocida"
        },
        "learning_objectives": [
            "Evaluar control metabólico en diabetes",
            "Educar sobre automonitoreo de glucosa",
            "Promover cambios de estilo de vida",
            "Prevenir complicaciones de diabetes"
        ],
        "simulation_type": "individual",
        "created_by": "system",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Caso 19: Adolescente con depresión
    cases.append({
        "case_id": "case_enf_comu005",
        "title": "Salud Mental en Adolescente - Depresión",
        "specialty": "Enfermería Comunitaria",
        "difficulty": "medio",
        "scenario": "Adolescente de 15 años derivada por profesora debido a bajo rendimiento académico, aislamiento social y cambios en el comportamiento. Refiere tristeza constante y problemas para dormir.",
        "instructions": "Realiza tamizaje de salud mental. Establece rapport con adolescente. Evalúa factores de riesgo. Coordina derivación a especialista. Involucra a familia.",
        "patient_profile": {
            "name": "Valentina Rojas",
            "age": 15,
            "gender": "Femenino",
            "chief_complaint": "Tristeza y problemas de sueño",
            "vital_signs": {
                "hr": 75,
                "bp": "105/65",
                "temp": 36.6,
                "rr": 16,
                "spo2": 98
            },
            "medical_history": ["Ninguno relevante"],
            "current_medications": ["Ninguna"],
            "allergies": "Ninguna conocida"
        },
        "learning_objectives": [
            "Realizar tamizaje de salud mental en adolescentes",
            "Establecer comunicación efectiva con adolescentes",
            "Identificar factores de riesgo de depresión",
            "Coordinar derivación a salud mental"
        ],
        "simulation_type": "individual",
        "created_by": "system",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Caso 20: Campaña de vacunación
    cases.append({
        "case_id": "case_enf_comu006",
        "title": "Campaña de Vacunación Comunitaria - Influenza",
        "specialty": "Enfermería Comunitaria",
        "difficulty": "fácil",
        "scenario": "Operativo de vacunación contra influenza en centro comunitario. Llega adulto mayor de 75 años que refiere alergia al huevo. Consulta si puede recibir la vacuna. Presenta cartola con esquema previo.",
        "instructions": "Evalúa contraindicaciones de vacuna. Revisa historia de vacunación. Educa sobre beneficios y efectos adversos. Administra vacuna según protocolo. Registra correctamente.",
        "patient_profile": {
            "name": "Doña Elena Paz",
            "age": 75,
            "gender": "Femenino",
            "chief_complaint": "Vacunación contra influenza",
            "vital_signs": {
                "hr": 72,
                "bp": "140/80",
                "temp": 36.5,
                "rr": 16,
                "spo2": 96
            },
            "medical_history": ["Hipertensión arterial", "Alergia al huevo (leve)"],
            "current_medications": ["Losartán 50mg"],
            "allergies": "Huevo (urticaria leve en la infancia)"
        },
        "learning_objectives": [
            "Evaluar contraindicaciones de vacunas",
            "Administrar vacunas de forma segura",
            "Educar sobre inmunizaciones",
            "Registrar actos de vacunación correctamente"
        ],
        "simulation_type": "individual",
        "created_by": "system",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # ========== CASOS ADICIONALES PARA LLEGAR A 33 ==========
    
    # Caso 21: Herida infectada
    cases.append({
        "case_id": "case_enf_clinic009",
        "title": "Curación de Herida Infectada",
        "specialty": "Enfermería Clínica",
        "difficulty": "medio",
        "scenario": "Paciente de 50 años con herida quirúrgica abdominal post-apendicectomía de hace 10 días. Presenta signos de infección: eritema, secreción purulenta, dolor y temperatura local aumentada.",
        "instructions": "Evalúa la herida según criterios establecidos. Realiza curación con técnica aséptica. Identifica signos de infección. Educa sobre cuidados de heridas en casa.",
        "patient_profile": {
            "name": "Fernando Núñez",
            "age": 50,
            "gender": "Masculino",
            "chief_complaint": "Herida con secreción y dolor",
            "vital_signs": {
                "hr": 88,
                "bp": "125/80",
                "temp": 37.8,
                "rr": 18,
                "spo2": 97
            },
            "medical_history": ["Apendicitis aguda (operado hace 10 días)", "Diabetes tipo 2"],
            "current_medications": ["Metformina 850mg", "Analgésicos PRN"],
            "allergies": "Ninguna conocida"
        },
        "learning_objectives": [
            "Evaluar heridas quirúrgicas",
            "Realizar curaciones con técnica aséptica",
            "Identificar signos de infección de heridas",
            "Educar sobre cuidados de heridas"
        ],
        "simulation_type": "individual",
        "created_by": "system",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Caso 22: Dolor crónico
    cases.append({
        "case_id": "case_enf_clinic010",
        "title": "Manejo del Dolor Crónico Oncológico",
        "specialty": "Enfermería Oncológica",
        "difficulty": "difícil",
        "scenario": "Paciente de 60 años con cáncer de mama metastásico. Refiere dolor óseo intenso (8/10) que no cede con analgésicos habituales. Presenta insomnio y ansiedad relacionada al dolor.",
        "instructions": "Evalúa el dolor de forma integral. Implementa escala de valoración. Administra analgesia según escala OMS. Implementa medidas no farmacológicas. Brinda apoyo emocional.",
        "patient_profile": {
            "name": "Cecilia Vargas",
            "age": 60,
            "gender": "Femenino",
            "chief_complaint": "Dolor óseo intenso",
            "vital_signs": {
                "hr": 95,
                "bp": "135/85",
                "temp": 36.7,
                "rr": 20,
                "spo2": 95
            },
            "medical_history": ["Cáncer de mama con metástasis óseas", "Ansiedad"],
            "current_medications": ["Morfina liberación prolongada", "Paracetamol", "Ansiolíticos"],
            "allergies": "AINES (gastritis)"
        },
        "learning_objectives": [
            "Evaluar dolor de forma integral y multidimensional",
            "Aplicar escalas de valoración del dolor",
            "Administrar analgésicos según escala OMS",
            "Implementar cuidados paliativos"
        ],
        "simulation_type": "individual",
        "created_by": "system",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Caso 23: Paciente con sonda nasogástrica
    cases.append({
        "case_id": "case_enf_clinic011",
        "title": "Instalación y Cuidados de Sonda Nasogástrica",
        "specialty": "Enfermería Clínica",
        "difficulty": "medio",
        "scenario": "Paciente de 65 años con obstrucción intestinal requiere instalación de sonda nasogástrica para descompresión. Presenta náuseas, vómitos y distensión abdominal. Nunca ha tenido sonda previamente.",
        "instructions": "Explica el procedimiento al paciente. Instala sonda nasogástrica con técnica correcta. Verifica posición. Implementa cuidados de enfermería. Educa sobre cuidados.",
        "patient_profile": {
            "name": "Alberto Guzmán",
            "age": 65,
            "gender": "Masculino",
            "chief_complaint": "Náuseas, vómitos y distensión abdominal",
            "vital_signs": {
                "hr": 90,
                "bp": "130/80",
                "temp": 36.9,
                "rr": 18,
                "spo2": 96
            },
            "medical_history": ["Cirugía abdominal previa", "Adherencias intestinales"],
            "current_medications": ["Ninguna actual"],
            "allergies": "Ninguna conocida"
        },
        "learning_objectives": [
            "Instalar sonda nasogástrica con técnica correcta",
            "Verificar posición de la sonda",
            "Implementar cuidados de enfermería en paciente con SNG",
            "Prevenir complicaciones asociadas"
        ],
        "simulation_type": "individual",
        "created_by": "system",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Caso 24: Transfusión sanguínea
    cases.append({
        "case_id": "case_enf_clinic012",
        "title": "Administración de Transfusión Sanguínea",
        "specialty": "Enfermería Clínica",
        "difficulty": "medio",
        "scenario": "Paciente de 42 años con anemia severa (Hb: 6.5 g/dl) secundaria a sangrado digestivo. Médico indica transfusión de 2 unidades de glóbulos rojos. Paciente manifiesta temor a las transfusiones.",
        "instructions": "Verifica indicación y consentimiento. Realiza procedimiento de verificación cruzada. Administra hemoderivado según protocolo. Monitoriza reacciones adversas. Brinda apoyo emocional.",
        "patient_profile": {
            "name": "Rodrigo Pinto",
            "age": 42,
            "gender": "Masculino",
            "chief_complaint": "Debilidad extrema y palidez",
            "vital_signs": {
                "hr": 110,
                "bp": "100/60",
                "temp": 36.5,
                "rr": 20,
                "spo2": 94
            },
            "medical_history": ["Úlcera gástrica sangrante", "Sin transfusiones previas"],
            "current_medications": ["Omeprazol IV", "Hierro IV"],
            "allergies": "Ninguna conocida"
        },
        "learning_objectives": [
            "Realizar verificación cruzada de hemoderivados",
            "Administrar transfusión según protocolo",
            "Monitorizar reacciones transfusionales",
            "Manejar ansiedades del paciente"
        ],
        "simulation_type": "individual",
        "created_by": "system",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Caso 25: Paciente con COVID-19
    cases.append({
        "case_id": "case_enf_clinic013",
        "title": "Paciente con COVID-19 Moderado",
        "specialty": "Enfermería de Urgencias",
        "difficulty": "medio",
        "scenario": "Paciente de 55 años con diagnóstico confirmado de COVID-19, día 7 de síntomas. Presenta disnea, saturación de oxígeno 90%, fiebre persistente y tos. Requiere hospitalización e inicio de oxigenoterapia.",
        "instructions": "Implementa medidas de aislamiento respiratorio. Administra oxigenoterapia. Monitoriza estado respiratorio. Previene complicaciones. Brinda apoyo emocional.",
        "patient_profile": {
            "name": "Jorge Valenzuela",
            "age": 55,
            "gender": "Masculino",
            "chief_complaint": "Dificultad respiratoria progresiva",
            "vital_signs": {
                "hr": 102,
                "bp": "140/85",
                "temp": 38.5,
                "rr": 28,
                "spo2": 90
            },
            "medical_history": ["Hipertensión arterial", "Obesidad (IMC 31)"],
            "current_medications": ["Amlodipino 5mg"],
            "allergies": "Ninguna conocida"
        },
        "learning_objectives": [
            "Implementar medidas de aislamiento respiratorio",
            "Administrar oxigenoterapia de forma segura",
            "Monitorizar estado respiratorio",
            "Prevenir complicaciones de COVID-19"
        ],
        "simulation_type": "individual",
        "created_by": "system",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Caso 26: Neonato prematuro
    cases.append({
        "case_id": "case_enf_neonat001",
        "title": "Cuidados del Recién Nacido Prematuro",
        "specialty": "Enfermería Neonatal",
        "difficulty": "difícil",
        "scenario": "Recién nacido prematuro de 32 semanas, peso 1600g, en incubadora. Presenta dificultad respiratoria leve, requiere monitorización continua y alimentación por sonda orogástrica. Madre desea realizar cuidados piel a piel.",
        "instructions": "Monitoriza signos vitales neonatales. Implementa termorregulación. Administra alimentación por sonda. Facilita contacto piel a piel. Educa a los padres.",
        "patient_profile": {
            "name": "Bebé Sebastián Mora",
            "age": 0.01,
            "gender": "Masculino",
            "chief_complaint": "Prematuridad de 32 semanas",
            "vital_signs": {
                "hr": 148,
                "bp": "60/35",
                "temp": 36.8,
                "rr": 52,
                "spo2": 93
            },
            "medical_history": ["Parto prematuro", "Síndrome de dificultad respiratoria leve"],
            "current_medications": ["Surfactante pulmonar", "Vitamina K"],
            "allergies": "Ninguna conocida"
        },
        "learning_objectives": [
            "Monitorizar signos vitales en neonatos",
            "Implementar termorregulación en prematuros",
            "Administrar alimentación por sonda orogástrica",
            "Promover vínculo padres-bebé prematuro"
        ],
        "simulation_type": "equipo_interdisciplinario",
        "team_members": [
            {
                "role": "madre",
                "name": "Sra. Carolina Mora",
                "specialty": "Madre",
                "description": "Madre primeriza con parto prematuro, ansiosa"
            },
            {
                "role": "neonatologo",
                "name": "Dr. Héctor Silva",
                "specialty": "Neonatólogo",
                "description": "Especialista en cuidados neonatales"
            },
            {
                "role": "kinesiologo",
                "name": "Lic. Paula Rivas",
                "specialty": "Kinesióloga Neonatal",
                "description": "Realiza fisioterapia respiratoria neonatal"
            }
        ],
        "created_by": "system",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Caso 27: Hipertensión en el embarazo
    cases.append({
        "case_id": "case_enf_mat003",
        "title": "Gestante con Preeclampsia",
        "specialty": "Enfermería Materno-Infantil",
        "difficulty": "difícil",
        "scenario": "Gestante de 34 semanas presenta presión arterial 160/110 mmHg, cefalea intensa, edema generalizado y proteinuria. Sospecha de preeclampsia severa. Requiere hospitalización urgente.",
        "instructions": "Identifica signos de preeclampsia severa. Implementa monitorización materna-fetal. Administra tratamiento antihipertensivo. Previene convulsiones. Prepara para posible cesárea.",
        "patient_profile": {
            "name": "Jessica Morales",
            "age": 35,
            "gender": "Femenino",
            "chief_complaint": "Dolor de cabeza intenso e hinchazón",
            "vital_signs": {
                "hr": 98,
                "bp": "160/110",
                "temp": 36.8,
                "rr": 20,
                "spo2": 96
            },
            "medical_history": ["Primigesta añosa", "Sin controles prenatales regulares"],
            "current_medications": ["Ácido fólico"],
            "allergies": "Ninguna conocida"
        },
        "learning_objectives": [
            "Identificar signos de preeclampsia severa",
            "Implementar monitorización materno-fetal",
            "Administrar sulfato de magnesio de forma segura",
            "Prevenir complicaciones (eclampsia, síndrome HELLP)"
        ],
        "simulation_type": "equipo_interdisciplinario",
        "team_members": [
            {
                "role": "paciente",
                "name": "Jessica Morales",
                "specialty": "Gestante",
                "description": "Gestante con preeclampsia severa"
            },
            {
                "role": "obstetra",
                "name": "Dr. Manuel Castro",
                "specialty": "Obstetra",
                "description": "Decide conducta obstétrica"
            },
            {
                "role": "enfermera_senior",
                "name": "Enfermera Rosa Díaz",
                "specialty": "Enfermera Especialista",
                "description": "Experta en alto riesgo obstétrico"
            }
        ],
        "created_by": "system",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Caso 28: Rehabilitación cardíaca
    cases.append({
        "case_id": "case_enf_rehab001",
        "title": "Paciente Post-Infarto en Rehabilitación Cardíaca",
        "specialty": "Enfermería de Rehabilitación",
        "difficulty": "medio",
        "scenario": "Hombre de 58 años, 4 semanas post-infarto agudo al miocardio. Inicia programa de rehabilitación cardíaca. Manifiesta temor a realizar actividad física. Presenta factores de riesgo cardiovascular modificables.",
        "instructions": "Evalúa capacidad funcional. Educa sobre modificación de factores de riesgo. Implementa programa de ejercicio supervisado. Brinda apoyo emocional. Promueve adherencia.",
        "patient_profile": {
            "name": "Héctor Paredes",
            "age": 58,
            "gender": "Masculino",
            "chief_complaint": "Temor a hacer ejercicio post-infarto",
            "vital_signs": {
                "hr": 75,
                "bp": "125/80",
                "temp": 36.6,
                "rr": 16,
                "spo2": 97
            },
            "medical_history": ["Infarto agudo al miocardio (4 semanas)", "Hipertensión", "Dislipidemia", "Tabaquismo"],
            "current_medications": ["AAS", "Atorvastatina", "Enalapril", "Bisoprolol"],
            "allergies": "Ninguna conocida"
        },
        "learning_objectives": [
            "Evaluar capacidad funcional post-infarto",
            "Educar sobre modificación de factores de riesgo",
            "Implementar programa de ejercicio supervisado",
            "Brindar apoyo psicológico en rehabilitación cardíaca"
        ],
        "simulation_type": "equipo_interdisciplinario",
        "team_members": [
            {
                "role": "paciente",
                "name": "Héctor Paredes",
                "specialty": "Paciente",
                "description": "Hombre post-infarto con temor a la actividad física"
            },
            {
                "role": "cardiologo",
                "name": "Dra. Mónica Reyes",
                "specialty": "Cardióloga",
                "description": "Supervisa programa de rehabilitación"
            },
            {
                "role": "kinesiologo",
                "name": "Lic. Esteban Bravo",
                "specialty": "Kinesiólogo Cardiopulmonar",
                "description": "Dirige programa de ejercicios"
            }
        ],
        "created_by": "system",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Caso 29: Paciente con Alzheimer
    cases.append({
        "case_id": "case_enf_geria001",
        "title": "Adulto Mayor con Enfermedad de Alzheimer",
        "specialty": "Enfermería Geriátrica",
        "difficulty": "medio",
        "scenario": "Adulto mayor de 78 años con diagnóstico de Alzheimer moderado. Cuidadora (hija) refiere agitación nocturna, desorientación y rechazo a higiene personal. Presenta pérdida de peso. Familia sobrecargada.",
        "instructions": "Evalúa estado cognitivo y funcional. Identifica necesidades del paciente y cuidador. Implementa estrategias de manejo conductual. Educa a familia. Previene complicaciones.",
        "patient_profile": {
            "name": "Don Ernesto Lagos",
            "age": 78,
            "gender": "Masculino",
            "chief_complaint": "Agitación nocturna y rechazo a cuidados",
            "vital_signs": {
                "hr": 70,
                "bp": "130/75",
                "temp": 36.5,
                "rr": 16,
                "spo2": 96
            },
            "medical_history": ["Alzheimer moderado (diagnóstico hace 3 años)", "Hipertensión arterial"],
            "current_medications": ["Donepezilo 10mg", "Losartán 50mg"],
            "allergies": "Ninguna conocida"
        },
        "learning_objectives": [
            "Evaluar estado cognitivo y funcional en demencia",
            "Implementar estrategias de manejo conductual",
            "Educar a cuidadores sobre manejo de demencia",
            "Prevenir sobrecarga del cuidador"
        ],
        "simulation_type": "equipo_interdisciplinario",
        "team_members": [
            {
                "role": "familiar",
                "name": "Claudia Lagos (hija)",
                "specialty": "Cuidadora principal",
                "description": "Hija cuidadora, sobrecargada emocionalmente"
            },
            {
                "role": "geriatra",
                "name": "Dr. Osvaldo Muñoz",
                "specialty": "Geriatra",
                "description": "Especialista en psicogeriatría"
            },
            {
                "role": "trabajador_social",
                "name": "Lic. Verónica Soto",
                "specialty": "Trabajadora Social",
                "description": "Evalúa recursos y apoyos sociales"
            }
        ],
        "created_by": "system",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Caso 30: Emergencia obstétrica
    cases.append({
        "case_id": "case_enf_mat004",
        "title": "Hemorragia Post-Parto Inmediata",
        "specialty": "Enfermería Materno-Infantil",
        "difficulty": "difícil",
        "scenario": "Puérpera inmediata (10 minutos post-parto vaginal) presenta sangrado vaginal abundante (>500ml). Útero blando y aumentado de tamaño. Presión arterial en descenso. Taquicardia. Situación de emergencia obstétrica.",
        "instructions": "Identifica hemorragia post-parto. Implementa protocolo de código rojo obstétrico. Realiza masaje uterino. Administra uterotónicos. Monitoriza signos vitales. Prepara para posible intervención quirúrgica.",
        "patient_profile": {
            "name": "Gabriela Espinoza",
            "age": 31,
            "gender": "Femenino",
            "chief_complaint": "Sangrado vaginal abundante post-parto",
            "vital_signs": {
                "hr": 125,
                "bp": "90/55",
                "temp": 37.0,
                "rr": 24,
                "spo2": 94
            },
            "medical_history": ["Multipara (4 partos)", "Parto prolongado", "Anemia leve"],
            "current_medications": ["Oxitocina IV"],
            "allergies": "Ninguna conocida"
        },
        "learning_objectives": [
            "Identificar hemorragia post-parto tempranamente",
            "Implementar protocolo de código rojo obstétrico",
            "Realizar maniobras de control de hemorragia",
            "Trabajar en equipo en emergencia obstétrica"
        ],
        "simulation_type": "equipo_interdisciplinario",
        "team_members": [
            {
                "role": "paciente",
                "name": "Gabriela Espinoza",
                "specialty": "Puérpera",
                "description": "Mujer con hemorragia post-parto inmediata"
            },
            {
                "role": "obstetra",
                "name": "Dr. Ricardo Molina",
                "specialty": "Obstetra",
                "description": "Lidera equipo en código rojo obstétrico"
            },
            {
                "role": "anestesiologo",
                "name": "Dra. Paulina Cortés",
                "specialty": "Anestesióloga",
                "description": "Maneja reanimación y analgesia"
            }
        ],
        "created_by": "system",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Caso 31: Adolescente con TCA
    cases.append({
        "case_id": "case_enf_mental003",
        "title": "Adolescente con Anorexia Nerviosa",
        "specialty": "Enfermería en Salud Mental",
        "difficulty": "difícil",
        "scenario": "Adolescente de 16 años con anorexia nerviosa. IMC: 15.5. Amenorrea de 6 meses. Bradicardia. Familia refiere que esconde comida y hace ejercicio excesivo. Requiere hospitalización por desnutrición severa.",
        "instructions": "Evalúa estado nutricional y psicológico. Implementa plan de realimentación supervisada. Establece límites terapéuticos. Monitoriza complicaciones. Trabaja con familia.",
        "patient_profile": {
            "name": "Isidora Campos",
            "age": 16,
            "gender": "Femenino",
            "chief_complaint": "Pérdida de peso severa y amenorrea",
            "vital_signs": {
                "hr": 48,
                "bp": "85/50",
                "temp": 35.8,
                "rr": 14,
                "spo2": 96
            },
            "medical_history": ["Anorexia nerviosa (diagnóstico hace 8 meses)", "Depresión"],
            "current_medications": ["Fluoxetina 20mg"],
            "allergies": "Ninguna conocida"
        },
        "learning_objectives": [
            "Evaluar estado nutricional en TCA",
            "Implementar plan de realimentación segura",
            "Establecer límites terapéuticos",
            "Trabajar con familias en TCA"
        ],
        "simulation_type": "equipo_interdisciplinario",
        "team_members": [
            {
                "role": "paciente",
                "name": "Isidora Campos",
                "specialty": "Adolescente",
                "description": "Adolescente con anorexia nerviosa severa"
            },
            {
                "role": "psiquiatra",
                "name": "Dra. Lorena Briceño",
                "specialty": "Psiquiatra Infantojuvenil",
                "description": "Especialista en trastornos alimentarios"
            },
            {
                "role": "nutricionista",
                "name": "Lic. Carla Muñoz",
                "specialty": "Nutricionista",
                "description": "Diseña plan de realimentación"
            }
        ],
        "created_by": "system",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Caso 32: Paciente paliativo
    cases.append({
        "case_id": "case_enf_paliat001",
        "title": "Cuidados Paliativos en Paciente Terminal",
        "specialty": "Enfermería Paliativa",
        "difficulty": "difícil",
        "scenario": "Paciente de 70 años con cáncer pancreático avanzado en fase terminal. Dolor no controlado, disnea, ansiedad. Familia solicita apoyo. Paciente desea morir en casa con dignidad.",
        "instructions": "Evalúa necesidades físicas, emocionales y espirituales. Implementa control de síntomas. Brinda apoyo a familia. Facilita muerte digna. Respeta voluntades anticipadas.",
        "patient_profile": {
            "name": "Don Arturo Lara",
            "age": 70,
            "gender": "Masculino",
            "chief_complaint": "Dolor y dificultad respiratoria",
            "vital_signs": {
                "hr": 92,
                "bp": "100/60",
                "temp": 37.2,
                "rr": 26,
                "spo2": 88
            },
            "medical_history": ["Cáncer pancreático avanzado con metástasis", "Caquexia"],
            "current_medications": ["Morfina", "Midazolam", "Dexametasona"],
            "allergies": "Ninguna conocida"
        },
        "learning_objectives": [
            "Evaluar necesidades en cuidados paliativos",
            "Implementar control de síntomas en fase terminal",
            "Brindar apoyo a familia en duelo anticipado",
            "Respetar autonomía y voluntades anticipadas"
        ],
        "simulation_type": "equipo_interdisciplinario",
        "team_members": [
            {
                "role": "familiar",
                "name": "Familia Lara",
                "specialty": "Familiares",
                "description": "Familia en duelo anticipado"
            },
            {
                "role": "medico_paliativo",
                "name": "Dr. Alberto Fuentes",
                "specialty": "Médico Paliativista",
                "description": "Especialista en cuidados paliativos"
            },
            {
                "role": "psicologo",
                "name": "Lic. Daniela Opazo",
                "specialty": "Psicóloga",
                "description": "Apoyo emocional a paciente y familia"
            }
        ],
        "created_by": "system",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Caso 33: Urgencia pediátrica
    cases.append({
        "case_id": "case_enf_ped003",
        "title": "Niño con Convulsión Febril",
        "specialty": "Enfermería Pediátrica",
        "difficulty": "medio",
        "scenario": "Niño de 18 meses llega a urgencias tras presentar convulsión generalizada de 3 minutos de duración en domicilio. Madre refiere que tenía fiebre desde la mañana. Actualmente somnoliento pero reactivo.",
        "instructions": "Evalúa estado post-ictal. Identifica causa de fiebre. Implementa medidas de seguridad. Educa a padres sobre convulsiones febriles. Previene nuevos episodios.",
        "patient_profile": {
            "name": "Benjamín Araya",
            "age": 1.5,
            "gender": "Masculino",
            "chief_complaint": "Convulsión con fiebre",
            "vital_signs": {
                "hr": 145,
                "bp": "90/55",
                "temp": 39.3,
                "rr": 32,
                "spo2": 96
            },
            "medical_history": ["Primera convulsión febril", "Desarrollo normal"],
            "current_medications": ["Paracetamol PRN"],
            "allergies": "Ninguna conocida"
        },
        "learning_objectives": [
            "Evaluar niño post-convulsión febril",
            "Identificar signos de alarma neurológica",
            "Implementar medidas antipiréticas",
            "Educar a padres sobre convulsiones febriles"
        ],
        "simulation_type": "equipo_interdisciplinario",
        "team_members": [
            {
                "role": "madre",
                "name": "Sra. Pamela Araya",
                "specialty": "Madre",
                "description": "Madre muy angustiada tras convulsión del hijo"
            },
            {
                "role": "pediatra",
                "name": "Dr. Gonzalo Iturra",
                "specialty": "Pediatra de Urgencia",
                "description": "Evalúa y descarta complicaciones"
            },
            {
                "role": "enfermera_pediatrica",
                "name": "Enfermera Sofía Navarro",
                "specialty": "Enfermera Pediátrica",
                "description": "Especialista en urgencias pediátricas"
            }
        ],
        "created_by": "system",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Insertar todos los casos
    result = await db.clinical_cases.insert_many(cases)
    
    print(f"✅ Se insertaron {len(result.inserted_ids)} casos clínicos exitosamente")
    
    # Verificar inserción
    total = await db.clinical_cases.count_documents({})
    print(f"📊 Total de casos en la base de datos: {total}")
    
    # Mostrar resumen por especialidad
    specialties = await db.clinical_cases.distinct("specialty")
    print("\n📋 Casos por especialidad:")
    for specialty in specialties:
        count = await db.clinical_cases.count_documents({"specialty": specialty})
        print(f"   • {specialty}: {count} casos")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_cases())
