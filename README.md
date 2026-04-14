# Super Nicco

Un videogioco 3D ispirato a Super Mario, ambientato nel Chianti, dedicato a Niccolò.

## Gioca ora

👉 **[gcerretani.github.io/supernicco](https://gcerretani.github.io/supernicco)**

## Come si gioca

Raggiungi la torre medievale in fondo al livello entro **2 minuti**.

| Piattaforma | Movimento | Salto |
|---|---|---|
| Desktop | WASD / Frecce direzionali | Spazio |
| Mobile | Joystick (basso-sinistra) | Tasto A (basso-destra) |

### Oggetti

- ⚽ **Pallone Inter** (×5) — collezionabili bonus sparsi nel livello
- 🔵 **Sciarpa Inter** — powerup: invincibilità per 6 secondi

### Nemici

- **JuveFan** — blob bianco/nero che pattuglia avanti e indietro. Saltaci sopra per eliminarlo.
- **Botte rotolante** — rotola verso di te. Saltaci sopra o schivala.

### Fine livello

Raggiungi la torre → compare il **biglietto di auguri** 🎂

## Tech stack

- [Three.js r160](https://threejs.org/) — rendering 3D
- [NippleJS](https://yoannmoi.net/nipplejs/) — joystick mobile
- Vanilla JS (ES modules) — nessun bundler necessario
- GitHub Pages — hosting statico

## Struttura

```
/
├── index.html        # Entry point
├── style.css         # UI, HUD, schermate
└── js/
    ├── main.js       # Game loop e stato
    ├── scene.js      # Three.js setup
    ├── terrain.js    # Colline Chianti procedurali
    ├── player.js     # Nicco: personaggio + fisica
    ├── controls.js   # Tastiera + touch
    ├── enemies.js    # JuveFan + BarrelEnemy
    ├── level.js      # Piattaforme, collezionabili, torre
    └── ui.js         # HUD, schermate, card auguri
```

## Deploy su GitHub Pages

1. Vai su **Settings → Pages**
2. Source: `main` branch, cartella `/`
3. Salva — il gioco sarà disponibile all'URL sopra
