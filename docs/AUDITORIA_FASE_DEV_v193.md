# HallValla v193 - Auditoria profunda / Fase DEV

- config/ui-canonical.js es la fuente compartida de valores visuales.
- Produccion y ?dev arrancan desde los mismos valores.
- Produccion ya no consume calibraciones visuales privadas de localStorage.
- ?dev conserva localStorage solo como overlay temporal.
- Field Stats, lideres/mano y editor visual de Misiones
  salieron de system/settings-events.js y viven en dev/calibrators.js.
- dev/calibrators.js solo se carga con ?dev.
- hallvallaExportCanonicalUiDraft() exporta un borrador con formato canonico.
- Tablero, relojes y DET avanzado quedan para las siguientes fases porque aun mezclan runtime y editor.

Flujo: canonical -> PROD y DEV -> overlay DEV -> export -> aprobacion -> canonical.
