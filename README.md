# 🗡️ Rogue:BLADE

A strategic cyberpunk auto-battler with roguelite elements. Build, upgrade, and program your own smart-shuriken swarm using a visual drag-and-drop logic system.

> 📝 For a deep dive into the mechanics, read the full [Game Design Document](./docs/GDD.md).

# 📖 About the Project

**Rogue:BLADE** is a high-stakes, strategic cyberpunk auto-battler set in a dystopian future where Earth has fallen to the interstellar **Zenith Collective**. As a cyber-engineer for the human resistance (**The Remnant Fleet**), you operate from a secret underground workshop in the **Substrata**, building and programming **Smart-Shurikens**—autonomous, high-speed blade drones designed to reclaim the mega-cities sector by sector.

The gameplay is divided into two strict phases:

1. **The Workshop (Active):** A UI-heavy management phase. Build, repair, and program your Shuriken swarm. Use the **Gambit System**—a visual drag-and-drop logic interface—to define complex AI behaviors (IF/THEN routines) that allow your drones to react to battlefield conditions autonomously.
2. **The Liberation Strike (Passive):** A 2D auto-battler simulation. Watch your programmed swarms fight through procedurally generated sectors. Success depends on the synergy between your hardware choices (Engines, Sensors, Blades) and the logic routines you've flashed onto their internal processors.

# 🛠️ Tech Stack

* **Frontend Framework:** Angular 21 (Latest stable)
* **State Management:** Angular Signals & [NgRx SignalStore](https://ngrx.io/guide/signals/signal-store)
* **Language:** TypeScript (Strict Mode)
* **Styling:** Tailwind CSS & SCSS
* **UI Interactions:** `@angular/cdk/drag-drop` (for the Gambit Compiler)
* **Combat Engine:** HTML5 Canvas API / Phaser.js (High-frequency simulation loop)
* **Testing:** [Vitest](https://vitest.dev/)

# 🚀 Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

## Prerequisites
* Node.js (v22 or higher recommended)
* Angular CLI

> npm install -g @angular/cli

## Installation

1. Clone the repository:
> git clone https://github.com/yourusername/rogue-blade.git

2. Navigate into the project directory:
> cd rogue-blade

3. Install dependencies:
> npm install

4. Start the development server:
> npm run start

5. Open your browser and navigate to http://localhost:4200/. The app will automatically reload if you change any of the source files.

## Angular Development

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.8.

### Code scaffolding
To generate a new component, run:
`ng generate component component-name`

### Building
To build the project run:
`ng build`
This will compile your project and store the build artifacts in the `dist/` directory.

### Running unit tests
To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:
`ng test`

# 🗺️ Roadmap / Milestones

* [x] **Phase 0:** Concept & Game Design Document
* [x] **Phase 1:** Workshop Architecture & Gambit UI (Drag & Drop Logic Compiler)
* [/] **Phase 2 (Current):** Core Combat Loop (2D Tactical Map, AI Movement, Strike Physics)
* [ ] **Phase 3:** Roguelite Loop (Sector Navigation, Randomized Loot, Meta-Progression)
* [ ] **Phase 4:** Polish & Expansion (Mobile Optimization, Boss Encounters, PvP Simulation)

# ⚙️ Hardware & Programming Synergy

The strategic depth of **Rogue:BLADE** comes from the modular interaction between physical components and software routines:

* **Anti-Grav Engines:** Define speed, evasion, and acoustic stealth profiles.
* **Hull Materials:** From lightweight **Plasteel** to near-indestructible **Neutronium-Cast**.
* **Sensors (Software Keys):** Equipment like **Terahertz Arrays** or **Lidar** are required to unlock specific AI triggers (e.g., "IF Enemy: Obscured").
* **Blades & Edges:** Specialized damage types, from **Vibro-Blades** for armor-piercing to **Plasma Cutters** for shield disruption.

# ⚖️ License & Copyright

Copyright (c) 2026. All Rights Reserved.

This repository and its contents are strictly private and proprietary. Unauthorized copying, modification, distribution, or use of this code and game concept, via any medium, is strictly prohibited.
