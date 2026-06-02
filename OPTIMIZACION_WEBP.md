# Optimización de assets a WebP

Se convirtieron los retratos PNG restantes de líderes a WebP para reducir el peso del repositorio sin romper transparencia ni referencias.

Archivos convertidos:
- assets/leaders/leader_warrior.png -> assets/leaders/leader_warrior.webp
- assets/leaders/leader_archer.png -> assets/leaders/leader_archer.webp
- assets/leaders/leader_mage.png -> assets/leaders/leader_mage.webp

Referencias actualizadas:
- index.html
- script.js

Notas:
- WebP conserva transparencia, así que estos retratos no requieren seguir en PNG.
- Se eliminan los PNG originales para evitar duplicar peso en el repo.
