# Notas de mantenimiento

## Antes de borrar assets

No borrar assets por intuición. Primero revisar si el archivo está siendo llamado en:

- `script.js`
- `styles.css`
- `index.html`

## Líderes

El sistema actual usa `LEADER_PORTRAITS` para conectar cada líder con su PNG 3D.

Si se cambia un nombre de archivo en `assets/leaders/`, también hay que cambiarlo en `LEADER_PORTRAITS`.

## Documentos

La carpeta `docs/` debe mantenerse como documentación viva.

Evitar acumular notas viejas de patches que ya no sirven para entender el estado actual.

## ZIP de entrega

Los ZIP entregados deben ir sin carpeta `.git`.
