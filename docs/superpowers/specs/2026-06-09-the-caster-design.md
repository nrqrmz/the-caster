# The Caster — Documento de Diseño

**Fecha:** 2026-06-09
**Estado:** Aprobado (diseño) — pendiente plan de implementación

---

## 1. Visión general

**The Caster** es un videojuego de acción top-down (estilo "survivor" / twin-stick) hecho en **Phaser 3**, **mobile-only**, publicado en **GitHub Pages**.

El jugador controla a una **hechicera huérfana**, hija de una princesa y un hechicero que fueron ejecutados por su amor prohibido. Ella viene a **vengar la muerte de sus padres** contra su abuelo materno, el Rey. A lo largo de varios escenarios pelea contra oleadas de enemigos (aldeanos, guerreros, arqueros, soldados élite, monjes sanadores…), enfrenta minibosses y bosses, y cada boss le revela parte de la historia antes de avanzar al siguiente escenario.

### Restricciones técnicas (fijas)
- **Phaser 3**, física **Arcade**.
- **Mobile-only**, orientación **portrait (vertical)**.
- **HTML mínimo**, **CSS solo lo esencial**, todo lo demás en Phaser.
- **Sin build / sin Vite** — módulos ES nativos + Phaser por CDN.
- **Capacidad de fullscreen en mobile.**
- Deploy estático a **GitHub Pages**.
- Persistencia en **localStorage** (sin servidor).

---

## 2. Decisiones de diseño (resumen de lo acordado)

| Tema | Decisión |
|---|---|
| Perspectiva / control | Top-down arena. Joystick virtual (un dedo) para mover y esquivar. |
| Disparo básico | **Auto-aim automático**: orbe azul al enemigo más cercano. |
| Skills | **Botones activos con cooldown** (🔥⚡☠️❄️). |
| Desbloqueo de skills | Por **templos elementales** (aire→thunderbolt, tierra→poison, fuego→fireball, agua→freeze). |
| Progresión | **Skill points fijos** al completar un escenario → **skill tree persistente**. |
| Muerte | **Reinicia solo el escenario actual.** Progreso conservado. |
| Guardado | **localStorage** (skill tree, skills/templos, escenario actual). |
| Arte | **Geométrico (por código) primero**, swap a assets después sin tocar lógica. |
| Tooling | **Sin build.** Migrar a Vite solo si se choca con un muro concreto (plugin npm, carga lenta, testing serio). |
| Roguelike | **Descartado para v1.** Posible "modo Arena/Endless" futuro tras terminar la campaña. |

---

## 3. Arquitectura técnica

### Stack
- Phaser 3 (CDN), física Arcade.
- Módulos ES nativos (`import`/`export`), sin bundler.
- Scale Manager en modo `FIT`, orientación portrait.

### Estructura del proyecto
```
the-caster/
  index.html            # mínimo: canvas + botón "tap para jugar/fullscreen"
  styles.css            # mínimo: reset, viewport full, centrar canvas
  src/
    main.js             # config de Phaser, Scale Manager, lista de escenas
    scenes/
      BootScene.js
      PreloadScene.js
      MenuScene.js
      DialogueScene.js
      GameScene.js       # la arena / combate
      UIScene.js         # HUD: joystick + botones de skill + vida
      SkillTreeScene.js
    objects/
      Caster.js
      Enemy.js
      Projectile.js
      Boss.js
      Temple.js
    systems/
      WaveSystem.js
      SaveSystem.js      # localStorage
      InputSystem.js     # joystick virtual + touch
      CombatSystem.js    # cálculo de daño (lógica pura, testeable)
    data/
      enemies.js
      skills.js
      scenarios.js       # oleadas, diálogos, templos por escenario
      skilltree.js
  assets/                # vacío por ahora (arte geométrico va por código)
  docs/superpowers/specs/
```

### Mobile & Fullscreen
- **Scale Manager** `FIT` → se adapta a cualquier pantalla.
- **Fullscreen** se activa con un **gesto del usuario** (tap inicial "Tap para jugar").
- **iOS Safari (iPhone):** no soporta la Fullscreen API real → se usa fallback CSS (`meta viewport`, `100dvh`, ocultar barra de direcciones) para *simular* pantalla completa. Android usa fullscreen nativo. Ambos casos manejados.

### Deploy
- Subir los archivos estáticos a GitHub Pages.
- El jugador solo abre la URL en el navegador de su teléfono; no necesita nada más.

---

## 4. Gameplay y sistemas

### Control (portrait)
- **Joystick virtual** abajo-izquierda, dibujado con Phaser (sin plugin npm). Aparece donde toca el pulgar; mueve a la hechicera por velocidad.
- **Botones de skill** abajo-derecha con cooldown visible (arco que se rellena). Solo aparecen las skills ya desbloqueadas.
- HUD en **`UIScene`** separada de la `GameScene` para que no se mueva con la cámara.

### Combate (auto-aim)
- Cada X ms la hechicera busca al **enemigo más cercano** y lanza un **orbe azul** hacia él.
- **Proyectiles pooled** (reciclados, no creados/destruidos en bucle) — rendimiento en mobile.
- Colisiones Arcade: orbe↔enemigo (daño), enemigo↔hechicera (daño a la hechicera).

### Enemigos
| Enemigo | Comportamiento |
|---|---|
| Aldeano | Melee débil, corre recto hacia ti. |
| Guerrero | Melee con más vida, más lento. |
| Arquero | Mantiene distancia y dispara flechas. |
| Soldado élite (tanque) | Muy lento, mucha vida, golpe fuerte. |
| Monje sanador | Huye del combate y cura a otros enemigos (prioridad de matar). |

Spawnean en los bordes de la arena. Cada uno = datos + comportamiento simple.

### Skills activas (por templos elementales)
- 🔥 **Fireball** (fuego): proyectil que explota en área.
- ⚡ **Thunderbolt** (aire): rayo instantáneo, daño en línea/cadena.
- ☠️ **Poison** (tierra): zona de daño por tiempo (DoT).
- ❄️ **Freeze** (agua): zona que congela/ralentiza.
- Cada una es un botón con cooldown.

### Estructura de un escenario (`WaveSystem`)
```
Oleada 1 → Oleada 2 → Oleada 3 → MINIBOSS → (aparece TEMPLO) → BOSS
```
- El `WaveSystem` controla tiempos: spawnea grupos, espera a que se limpie, lanza el siguiente.
- El **Templo** aparece tras el miniboss: caminas hacia él y aprendes la skill (con mini-diálogo).
- El **Boss** es un enemigo grande con más vida y un par de ataques; al morir dispara el diálogo de historia y termina el escenario.

---

## 5. Progresión y guardado

### Skill tree + skill points
- Al **completar un escenario** → cantidad **fija** de skill points.
- **`SkillTreeScene`** para gastarlos en mejoras permanentes:
  - Basic damage, shot rate, velocidad de movimiento, vida máxima.
  - Daño de Fireball, cooldown de Fireball, etc. (cada skill con su ramita).
- Es un **árbol** (no lista plana): algunas mejoras requieren la anterior → decisiones de build.
- Definido en `data/skilltree.js`.

### SaveSystem (localStorage)
- Un objeto JSON con: skill points disponibles, mejoras compradas, skills/templos desbloqueados, escenario actual.
- Campo **`version`** para migrar saves viejos sin romperlos.
- Solo guarda progreso "entre escenarios", no el estado en mitad del combate. Morir → reinicia el escenario.

---

## 6. Narrativa / diálogo

- **`DialogueScene`** superpuesta: caja de texto abajo + nombre del hablante (retrato cuando haya arte).
- **Tap para avanzar** línea por línea.
- Diálogos como **datos**: array de `{ hablante, texto }` en `data/scenarios.js`.
- Disparadores: intro del juego, llegada al templo, muerte del boss.

---

## 7. Diseño data-driven

- Enemigos, skills, oleadas, diálogos y árbol = **objetos de datos planos**, separados de la lógica.
- Agregar escenario o enemigo = agregar datos, no reescribir código.
- El **arte es una "clave"**: hoy dibuja una forma geométrica; mañana apunta a un sprite. Cambiar de geométrico a assets **no toca la lógica**.

---

## 8. Testing

- El "feel" se prueba **jugando** (playtest manual en el teléfono) — no se automatiza.
- La **lógica pura sí** se prueba: cálculo de daño (`CombatSystem`), `SaveSystem` (serializar/leer localStorage), skill tree (puntos y prerrequisitos), lógica del `WaveSystem`.
- Esa lógica se mantiene **separada de Phaser** (funciones puras) para que sea testeable. Sin Vite: test runner ligero solo para esos módulos, o validación manual si se quiere mantener mínimo.

---

## 9. Alcance del Vertical Slice (primera versión jugable)

Probar **todo el flujo** con contenido mínimo:

```
Diálogo intro
  → Escenario 1: 2-3 oleadas
  → Miniboss
  → Templo de fuego (desbloquea Fireball)
  → Boss + diálogo de historia
  → SkillTreeScene (ganas y gastas skill points)
```

Contenido mínimo del slice:
- 1 escenario completo de punta a punta.
- 2-3 tipos de enemigos.
- 1 miniboss, 1 boss.
- 1 skill activa (Fireball, vía templo de fuego).
- Skill tree funcional con varias mejoras.
- Guardado en localStorage.
- Fullscreen + control portrait funcionando en mobile.

Una vez validado el slice, se replica para construir los demás escenarios, enemigos, templos y skills.

---

## 10. Fuera de alcance (v1)

- Modo roguelike / Arena / Endless (futuro).
- Arte final (se empieza geométrico).
- Vite / build / npm (se agrega solo si se necesita).
- Escalado de dificultad tipo New Game+.
- Audio/música (no discutido aún; se decidirá en planificación si entra al slice).
