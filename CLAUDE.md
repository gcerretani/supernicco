# CLAUDE.md – Super Nicco

## Panoramica progetto

Videogioco 3D browser-based ispirato a Super Mario, chiamato **Super Nicco**.
Dedicato a Niccolò come regalo di compleanno personalizzato.

- **Stack**: Three.js r160 (CDN), NippleJS (CDN), Vanilla JS ES modules
- **Hosting**: GitHub Pages (statico, nessun build step)
- **Livello**: unico livello lineare ~2 minuti, meta la torre medievale al fondo

## Architettura

```
js/main.js       ← game loop, collision detection, state machine
js/scene.js      ← Three.js renderer, camera, luci
js/terrain.js    ← terreno procedurale Chianti + decorazioni (cipressi, vigne)
js/player.js     ← personaggio Nicco (low-poly), fisica, animazione corsa
js/controls.js   ← input tastiera WASD + joystick NippleJS mobile
js/enemies.js    ← JuveFan (bianco/nero) e BarrelEnemy (botti rotolanti)
js/level.js      ← piattaforme, palloni Inter, sciarpa powerup, torre goal
js/ui.js         ← HUD, schermate, card auguri animata, confetti
```

## Personaggio: Nicco

Il personaggio è costruito interamente con primitive Three.js (BoxGeometry, SphereGeometry).
È ispirato a Niccolò: bambino con capelli castani spettinati e ciuffo, carnagione olivastra.

Colori chiave:
- Carnagione: `#e8b49a`
- Capelli: `#2d1a0e`
- Maglia Inter (strisce): `#000000` / `#0066cc`
- Occhi: `#1a0a00`

## Tema visivo

- **Inter**: nero `#000000` + blu `#0066cc` + azzurro `#0099ff`
- **Chianti**: verde toscano, cipressi, vigne, torre medievale, cielo `#87CEFA`
- **Stile**: low-poly colorato (nessuna texture esterna, tutto procedurale)

## Gameplay

| Elemento | Dettaglio |
|---|---|
| Timer | 2 minuti (countdown), game over allo scadere |
| Palloni Inter | 5 collezionabili, galleggiano e ruotano |
| Sciarpa Inter | Powerup invincibilità 6s |
| JuveFan | Blob bianco/nero, pattuglia Z, eliminabile con stomping |
| BarrelEnemy | Botte che rotola, eliminabile con stomping |
| Goal | Torre medievale a z=-188, raggio 3.5 |
| Vittoria | Card auguri "Tanti Auguri Niccolò!" + confetti blu/Inter |

## Coordinate di gioco

- Il livello va da `z=0` (start) a `z=-188` (goal)
- Il giocatore si muove principalmente lungo l'asse Z negativo
- La camera segue il giocatore da dietro (+Z) e dall'alto (+Y)
- Terreno: funzione seno/coseno, altezze da -5 a +5 unità

## Comandi utili (sviluppo)

```bash
# Server locale (qualsiasi opzione va bene, es. con Python):
python3 -m http.server 8080
# oppure con Node:
npx serve .
```

Aprire poi `http://localhost:8080` nel browser.
Usare Chrome DevTools → Device toolbar per testare i controlli mobile.

## Note importanti

- **Nessun bundler**: tutti i file JS sono ES modules caricati direttamente dal browser
- **Nessun asset esterno**: tutto il 3D è generato proceduralmente via Three.js
- **GitHub Pages**: abilitare da Settings → Pages → Source: `main`, root `/`
- Per fare restart pulito la pagina viene ricaricata (`window.location.reload()`)
