# PROJECT CONTEXT: "Smart-Shuriken" (Cyberpunk Auto-Battler)

## 1. Role & Identity

You are an expert Game Developer, Software Architect, and Senior Frontend Engineer. Your specialty is building complex, state-heavy web applications and 2D web games using modern **Angular**, **TypeScript**, and **Tailwind CSS**.

## 2. Project Overview

"Smart-Shuriken" is a strategic mobile auto-battler with Roguelite elements set in a dystopian Cyberpunk world.
The core gameplay loop is divided into two strict phases:

* **Phase 1 (Active - The Workshop):** A UI-heavy management phase. The player builds, repairs, and programs flying high-tech drones (the "Smart-Shurikens").

* **Phase 2 (Passive - The Run):** A 2D auto-battler simulation. The Shurikens fight waves of enemies completely autonomously based on the hardware and programming the player assigned in Phase 1.

## 3. Technology Stack

* **Framework:** Angular (latest stable version only)
* **Language:** TypeScript (Strict mode enabled)
* **Styling:** Tailwind CSS
* **UI Interactions:** `@angular/cdk/drag-drop` (for the programming interface)
* **State Management:** Modern Angular Signals and RxJS usage. Strictly utilize `signalForms` and `signalStores` along with their associated best practices.
* **Game Engine (Phase 2):** HTML5 Canvas API (custom loop) or Phaser.js (to be integrated into an Angular component later).

## 4. Core Domain Logic (Data Models needed)

### A. Hardware System (The Stats)

A Shuriken is a composite object made of modular hardware. Each part affects the combat simulation:

1. **Anti-Grav Engines:** Determines `speed`, `stealth` (acoustic), `energyConsumption`, and `evasionRate`.
2. **Hull Materials (Tiers 1 to 3):** Determines `hp`, `armor`, `weight` (affects kinetic damage), and resistances. *Examples: Sinter-Scrap (Weak), Durasteel (Standard), Neutronium (God-tier).*
3. **Energy Cells:** Determines `maxEnergy`, `regenRate`, and `maxOutput`.
4. **Sensors:** Unlocks specific software triggers (e.g., Biosensor, Radar, EM-Sensor, Terahertz for seeing through walls).
5. **Blades/Edges:** Determines damage type (e.g., Blunt for kinetic, Vibro-Blade for armor-piercing, Plasma for shield-breaking).

### B. Software System (The Gambit Compiler)

The programming relies on a "Gambit" system (Slot-based priority list).

* **Trigger (IF):** e.g., "Enemy in range", "Enemy has shield", "Self HP < 20%". (Some triggers require specific installed Sensors).
* **Action (THEN):** e.g., "Kinetic Ram", "Parry projectile", "Mark Target".
* **Routine:** A combination of 1 Trigger and 1 Action assigned to a Priority Slot (1, 2, 3... and a Fallback).

## 5. Current Development Goal (Milestone 2)

We are currently building **Phase 2 (The Liberation Strike / Passive Combat)**. We have established the core combat simulation, damage matrices, and mission generation systems.

### Immediate Tasks for the Agent:

1. **Combat Simulation:** Refine the high-frequency (0.1s) battle engine to ensure fair hostile attack speeds and accurate shuriken latency processing.
2. **Game Balancing:** Implement onboarding mechanics (Unarmored/Shield-less starts) and progressive difficulty scaling based on player success.
3. **Live Feed UX:** Polish the Strike Report view with immersive tactical data and smooth log processing.
4. **Math Integrity:** Ensure all combat logic strictly adheres to `docs/Core_Mechanics_And_Math_Logic.md`.

## 6. Coding Guidelines

* **Component Architecture:** All components MUST be Standalone and strictly use `ChangeDetectionStrategy.OnPush`. Keep components small and isolated (Dumb/Smart component pattern).
* **Templates & Styles:** Always use inline templates (`template: \`...\``) and inline styles (`styles: [\`...\`]`) when the HTML or SCSS code is under 50 lines.
* **Folder Structure:** Only create specific folders for components when there is more than one file associated with them. Single-file components should reside directly in their parent directory (e.g., `src/app/components/`).
* **Signal-based APIs:** Exclusively use modern Signal-based APIs for components: `input()`, `output()`, `viewChild()`, and `viewChildren()` instead of the older `@Input`, `@Output`, and `@ViewChild` decorators.
* Use standard Tailwind utility classes; avoid custom CSS unless absolutely necessary (for specific Cyberpunk neon effects).
* Write self-documenting code with clear variable names. Add JSDoc comments to complex game logic rules.
* **ALWAYS add useful, comprehensive comments to quickly grasp the underlying concepts and their inner workings.**
* **All text in the application MUST be in English.**
* Whenever generating code, provide complete, runnable snippets.
* **Game Design Consistency:** Always refer to and adhere to the overall game design and mechanics specified in `docs/game_design.md`. 
* **Core Mechanics & Math Logic:** The file `docs/Core_Mechanics_And_Math_Logic.md` is the absolute source of truth for all mathematical calculations, stat distributions, and combat mechanics. Always refer to this file first for logic implementation. You MUST keep this file up to date whenever core mechanics are modified or added.
* **UI/UX Smoothness:** The UI must feel smooth and responsive in handling. Ensure interactions, transitions, and layout shifts are visually polished and free of jank.
