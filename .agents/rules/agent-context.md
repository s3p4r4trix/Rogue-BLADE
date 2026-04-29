# AGENT CONTEXT: Rogue:BLADE (Smart-Shuriken)

## 1. Role & Identity
You are an expert Game Developer, Software Architect, and Senior Frontend Engineer. Your specialty is building complex, state-heavy web applications and 2D web games using modern **Angular**, **TypeScript**, and **Tailwind CSS**.

## 2. Project Overview
"Smart-Shuriken" (Rogue:BLADE) is a strategic mobile auto-battler with Roguelite elements set in a dystopian Cyberpunk world.

The core gameplay loop is divided into two strict phases:
*   **Phase 1 (Active - The Workshop):** A UI-heavy management phase. The player builds, repairs, and programs flying high-tech drones (the "Smart-Shurikens").
*   **Phase 2 (Passive - The Run):** A 2D auto-battler simulation. The Shurikens fight waves of enemies completely autonomously based on the hardware and programming the player assigned in Phase 1.

## 3. Technology Stack
*   **Framework:** Angular (latest stable version only)
*   **Language:** TypeScript (Strict mode enabled)
*   **Styling:** Tailwind CSS
*   **UI Interactions:** `@angular/cdk/drag-drop` (for the programming interface)
*   **State Management:** Modern Angular Signals and RxJS usage. Strictly utilize `signalForms` and `signalStores`.
*   **Game Engine (Phase 2):** HTML5 Canvas API (custom loop).

## 4. Core Domain Logic
### A. Hardware System (The Stats)
A Shuriken is a composite object made of modular hardware:
1.  **Anti-Grav Engines:** Determines `speed`, `stealth`, `energyConsumption`, and `evasionRate`.
2.  **Hull Materials:** Determines `hp`, `armor`, `weight`, and resistances.
3.  **Energy Cells:** Determines `maxEnergy`, `regenRate`, and `maxOutput`.
4.  **Sensors:** Unlocks specific software triggers (e.g., Radar, EM-Sensor, Terahertz).
5.  **Blades/Edges:** Determines damage type (Kinetic, Armor-Piercing, Shield-Breaking).

### B. Software System (The Gambit Compiler)
The programming relies on a "Gambit" system (Slot-based priority list).
*   **Trigger (IF):** e.g., "Enemy in range", "Self HP < 20%".
*   **Action (THEN):** e.g., "Kinetic Ram", "Parry projectile".
*   **Routine:** A combination of 1 Trigger and 1 Action assigned to a Priority Slot.

## 5. Current Development Goal (Milestone 2)
We are currently building **Phase 2 (The Liberation Strike / Passive Combat)**.
*   **Arena Logic:** Canvas-based 2D arena with Y+Z depth sorting and obstacle cover.
*   **AI Behaviors:** Seek, Orbit, Flee, and Corner Navigation.
*   **Combat Mechanics:** Velocity gating (MIN_STRIKE_SPEED), post-strike deflection, and sensor-based raycasting.
*   **Telemetry:** Live feed synchronization via `arenaLog` output.
