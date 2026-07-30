"""Shared constants for AMED-IA application"""

# Competency names used across the application
COMPETENCY_NAMES = [
    "Valoración y Diagnóstico",
    "Planificación del Cuidado",
    "Intervención Clínica",
    "Comunicación Terapéutica",
    "Pensamiento Crítico"
]

# Valid user roles
USER_ROLES = ["admin", "teacher", "student"]

# Valid case difficulties
CASE_DIFFICULTIES = ["Básico", "Intermedio", "Avanzado"]

# Valid case specialties
CASE_SPECIALTIES = [
    "Medicina Interna",
    "Pediatría",
    "Geriatría",
    "Salud Mental",
    "Cuidados Intensivos",
    "Urgencias",
    "Cirugía",
    "Materno-Infantil",
    "Salud Comunitaria"
]

# Simulation types
SIMULATION_TYPES = ["individual", "equipo_interdisciplinario"]

# Assignment modes
ASSIGNMENT_MODES = ["directed", "random"]

# Assignment types
ASSIGNMENT_TYPES = ["individual", "group"]

# Evaluation types
EVALUATION_TYPES = ["CASO", "GLOBAL"]

# Simulation statuses
SIMULATION_STATUSES = ["in_progress", "completed"]

# Assignment statuses
ASSIGNMENT_STATUSES = ["pending", "in_progress", "completed"]
