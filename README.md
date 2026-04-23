# 🗡️ Rogue:BLADE

A strategic cyberpunk auto-battler with roguelite elements. Build, upgrade, and program your own smart-shuriken swarm using a visual drag-and-drop logic system.

> 📝 For a deep dive into the mechanics, read the full [Game Design Document](./docs/GDD.md).

# 📖 About the Project

**Rogue:BLADE** divides gameplay into two strict phases:

1. The Workshop (Active): A UI-heavy management phase. You are a mechanic in a dystopian underground lab. Build, repair, and program flying high-tech drones ("Smart-Shurikens") using a visual Gambit system (IF/THEN logic).
2. The Run (Passive): A 2D auto-battler simulation. Your programmed Shuriken swarms fight waves of enemies (corporate security, EMP-grenadiers, hacker drones) completely autonomously based on your hardware and software setup.

# 🛠️ Tech Stack
* Frontend Framework: Angular
* Language: TypeScript (Strict mode)
* Styling: Tailwind CSS & SCSS
* UI Interactions: @angular/cdk/drag-drop
* State Management: Angular Signals
* Game Engine: HTML5 Canvas / Phaser.js (for the combat simulation)

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

* [x] Concept & Game Design Document
* [x] Static HTML/JS Prototype for the Gambit UI
* [x] Milestone 1: Angular Architecture & Workshop UI (Drag & Drop Gambit Compiler)
* [ ] Milestone 2: Core Combat Loop (Canvas/Phaser Auto-Battler Phase)
* [ ] Milestone 3: Roguelite Progression (Pathing, Meta-Upgrades)
* [ ] Milestone 4: Mobile Port (Capacitor/Ionic)

# ⚙️ Hardware & Programming Synergy

The strategic depth of Rogue:BLADE comes from the synergy between hardware components and AI routines:

* Anti-Grav Engines: Determine speed, acoustic stealth, and evasion.
* Hull Materials: Ranging from cheap Sinter-Scrap to god-tier Neutronium-Cast.
* Sensors: Required to unlock specific AI triggers (e.g., Terahertz sensors to detect enemies behind cover).
* Blades: From blunt kinetic edges (heavy impact) to shield-melting plasma cutters (high energy drain).

# ⚖️ License & Copyright

Copyright (c) 2026. All Rights Reserved.

This repository and its contents are strictly private and proprietary. Unauthorized copying, modification, distribution, or use of this code and game concept, via any medium, is strictly prohibited.
