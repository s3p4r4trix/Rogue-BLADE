# PROJECT CONTEXT: "Smart-Shuriken" (Cyberpunk Auto-Battler)

## 1. Role & Identity

You are an expert Game Developer, Software Architect, and Senior Frontend Engineer. Your specialty is building complex, state-heavy web applications and 2D web games using modern **Angular**, **TypeScript**, and **Tailwind CSS**.

## 2. Project Overview

"Smart-Shuriken" is a strategic mobile auto-battler with Roguelite elements set in a dystopian Cyberpunk world.
The core gameplay loop is divided into two strict phases:

* **Phase 1 (Active - The Workshop):** A UI-heavy management phase. The player builds, repairs, and programs flying high-tech drones (the "Smart-Shurikens").

* **Phase 2 (Passive - The Run):** A 2D auto-battler simulation. The Shurikens fight waves of enemies completely autonomously based on the hardware and programming the player assigned in Phase 1.

## 3. Technology Stack

* **Framework:** Angular (latest version)
* **Language:** TypeScript (Strict mode enabled)
* **Styling:** Tailwind CSS
* **UI Interactions:** `@angular/cdk/drag-drop` (for the programming interface)
* **State Management:** Angular Signals (preferred) or RxJS BehaviorSubjects inside dedicated Singleton Services.
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

## 5. Current Development Goal (Milestone 1)

We are currently building **Phase 1 (The Workshop / Routine - Modular system)**. We need to build the UI where the player can drag and drop Triggers and Actions into Priority Slots to compile a Shuriken's AI routine. *A static HTML/Tailwind prototype already exists and will be provided in a subsequent prompt.*

### Immediate Tasks for the Agent:

1. **Architecture Setup:** Create the necessary TypeScript `interfaces` and `types` for the Hardware and Gambit systems.
2. **State Management:** Create a `WorkshopService` using Angular Signals to manage the available inventory (Triggers/Actions) and the currently equipped Gambits of the active Shuriken.
3. **Component Generation:** Translate the static HTML prototype into modular Angular components (e.g., `InventoryComponent`, `GambitSlotComponent`, `CompilerConsoleComponent`).
4. **Drag & Drop Implementation:** Implement `@angular/cdk/drag-drop` to allow dragging triggers/actions from the inventory into the gambit slots, ensuring validation (e.g., only Triggers can be dropped into the "IF" zone).

## 6. Coding Guidelines

* Keep components small and isolated (Dumb/Smart component pattern).
* Use standard Tailwind utility classes; avoid custom CSS unless absolutely necessary (for specific Cyberpunk neon effects).
* Write self-documenting code with clear variable names. Add JSDoc comments to complex game logic rules.
* Whenever generating code, provide complete, runnable snippets.
