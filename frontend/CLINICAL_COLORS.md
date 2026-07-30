# AMED IA - Sistema de Colores Clínicos

## Paleta Principal

### Colores de Identidad
- **Primario (Azul Clínico)**: `#005A9C`
  - Hover: `#004578`
  - Uso: Botones principales, barras de navegación, headers, enlaces
  - Representa: Confianza y profesionalismo médico

- **Secundario (Verde Quirúrgico)**: `#10B981`
  - Uso: Indicadores de progreso, badges de éxito, confirmaciones
  - Representa: Salud, estabilidad, procedimientos exitosos

### Fondos y Superficies
- **Fondo de App**: `#F8FAFC` (Gris Quirúrgico Claro)
  - Simula la limpieza de un historial clínico digital

- **Superficies (Tarjetas)**: `#FFFFFF` (Blanco Puro)
  - Alto contraste con el fondo

- **Superficie Alternativa**: `#F1F5F9` (Gris Muy Claro)
  - Para elementos menos prominentes

### Tipografía
- **Texto Principal**: `#334155` (Gris Pizarra Oscuro)
  - Evita fatiga visual en textos largos
  - NUNCA usar #000000 (negro puro)

- **Texto Secundario**: `#64748B` (Gris Medio)
  - Para descripciones, metadatos

- **Texto Terciario**: `#475569` (Gris Oscuro)
  - Para información auxiliar

### Bordes
- **Bordes Primarios**: `#E2E8F0` (Gris Claro)
  - Sutiles pero visibles

---

## Sistema de Alertas y Triaje

⚠️ **IMPORTANTE**: Usar estos colores SOLO para lógica clínica, no para decoración

### Estados Críticos
- **Rojo Alerta**: `#EF4444`
  - Fondo: `#FEE2E2`
  - Uso EXCLUSIVO para:
    - Estados críticos del paciente (paro cardíaco, descompensación)
    - Respuestas incorrectas graves
    - Temporizadores agotados
    - Errores fatales

### Estados de Advertencia
- **Amarillo/Ámbar**: `#F59E0B`
  - Fondo: `#FEF3C7`
  - Uso para:
    - Alertas de atención
    - Efectos secundarios latentes
    - Signos vitales en observación
    - Advertencias no críticas

### Estados Estables
- **Verde Estable**: `#22C55E`
  - Fondo: `#ECFDF5`
  - Uso para:
    - Pacientes estables
    - Procedimientos realizados correctamente
    - Avances exitosos
    - Confirmaciones positivas

---

## Guías de Uso

### Contraste y Accesibilidad
- Ratio mínimo texto/fondo: 4.5:1 (WCAG AA)
- Texto principal (#334155) sobre blanco (#FFFFFF): ✓ 12.6:1
- Azul clínico (#005A9C) sobre blanco: ✓ 7.8:1

### Bordes Redondeados
- Tarjetas y contenedores: `rounded-lg` (8px)
- Botones: `rounded-md` (6px)
- Badges: `rounded-full`

### Jerarquía Visual
1. **Nivel 1 (Más importante)**: Botones primarios (#005A9C)
2. **Nivel 2 (Secundario)**: Badges de progreso (#10B981)
3. **Nivel 3 (Información)**: Tarjetas blancas con borde
4. **Nivel 4 (Contexto)**: Texto secundario (#64748B)

### Estados de Interacción
- **Normal**: Color primario
- **Hover**: Oscurecer 15-20%
- **Active**: Oscurecer 25%
- **Disabled**: Opacidad 50%

---

## Ejemplos de Código

### Botón Primario
```jsx
<button className="bg-[#005A9C] hover:bg-[#004578] text-white rounded-md px-6 py-3">
  Acción Principal
</button>
```

### Badge de Éxito
```jsx
<span className="bg-[#ECFDF5] text-[#10B981] px-3 py-1 rounded-full text-sm font-semibold">
  Paciente Estable
</span>
```

### Alerta Crítica
```jsx
<div className="bg-[#FEE2E2] border-l-4 border-[#EF4444] p-4 rounded-md">
  <p className="text-[#EF4444] font-semibold">Estado Crítico</p>
</div>
```

### Tarjeta de Contenido
```jsx
<div className="bg-white border border-[#E2E8F0] rounded-lg p-6 hover:shadow-md transition-all">
  <h3 className="text-[#334155] font-semibold">Título</h3>
  <p className="text-[#64748B]">Descripción</p>
</div>
```

---

## Notas de Implementación

- Todos los colores están implementados en línea con Tailwind classes
- Los archivos CSS globales definen colores base (App.css, index.css)
- El scrollbar usa el azul clínico (#005A9C)
- Los gradientes hero usan azul clínico + verde quirúrgico

**Última actualización**: Diciembre 2024
**Versión de paleta**: 2.0 (Clínica)
