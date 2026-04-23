# Game Design Document: Project "Rogue:BLADE" (Mobile / Auto-Battler)

## 1. Core Concept & Game Idea
"Rogue:BLADE" is a strategic mobile auto-battler with roguelite elements set in a dystopian cyberpunk world. The game centers on **Smart-Shuriken** – flying, drone-like projectile weapons. Players spend their active time in an underground workshop programming, repairing, and upgrading these shurikens. Combat is passive: players watch their creations autonomously navigate procedurally generated levels and fight waves of corporate security, gangs, and robots.

## 2. Mobile Gameplay Loop
The game is optimized for short "on-the-go" sessions. The loop is divided into two distinct phases:

* **Phase 1: The Base (Active - Management & Tactics)**
    * **Routine Building:** Configuring simple "If-Then" logic blocks.
    * **Hardware Tuning:** Customizing engines, materials, blades, energy cells, and sensors.
    * **Maintenance:** Repairing damaged shurikens.
    * **Workshop Management:** Research and interaction with NPCs (hackers, black-market mechanics) for technological advancement.

* **Phase 2: The Run (Passive - Observe & Learn)**
    * **Path Selection:** Choosing a route through the level (e.g., corporate HQ, rainy alleys, black markets) similar to "Slay the Spire."
    * **Execution:** Shurikens act 100% autonomously based on the Phase 1 programming.
    * **Learning Effect:** Players analyze logic failures and adapt their routines for the next run.

## 3. Software System (Mobile Routines)
The **Slot-based Gambit System** is the core mechanic.

* **Trigger (IF):** e.g., "Enemy in 5m radius," "Enemy has shield," "Self HP < 20%," "Enemy status: Marked." (Triggers often require specific sensors).
* **Action (THEN):** e.g., "Parry," "Kinetic Ram," "Guard Character," "Mark Target."
* **Priorities:** The order of slots determines the importance of actions.
* **Depth through Synergies:** Players can assign roles. A light shuriken marks targets (debuff), while a heavy shuriken is programmed to strike only marked targets.

## 4. Economy & Shuriken Management
* **Start Condition:** The player begins with one rudimentary, salvaged shuriken.
* **Scaling:** Over time, a full swarm of drones is built.
* **Wear & Repair:** Shurikens take damage but are never permanently destroyed. Post-run repair options:
    * **Passive (Time):** Nanites slowly restore the shuriken over time.
    * **Active (Resource):** Players spend credits (Crypto/Scrap) on a polymer solution for instant 100% repair.

## 5. Hardware System (Upgrades)

### 5.1 Anti-Grav Engines
* **Speed:** Maximum flight velocity.
* **Stealth (Acoustic):** Reduces engine noise and thermal signature.
* **Energy Consumption:** Power draw during operation.
* **Flux Capacitor:** Enables rapid direction changes and evasive maneuvers.

### 5.2 Hull Materials
Materials determine physical base stats (weight, durability, visual stealth).
* **Tier I (Common):** Sinter-Scrap, Plasteel, Poly-Titanium.
* **Tier II (Standard):** Durasteel, Tritanium, Kinetic-Graphene (Reactive Metal).
* **Tier III (Exotic):** Null-Field Steel, Neutronium-Cast, Adamant-Quantum-Grid, Singularity Matrix (Aetherium).

### 5.3 Energy Cells
* **Capacity:** Total energy stored.
* **Regeneration:** Charging speed during combat.
* **Max Output:** Required for burst maneuvers or energy-intensive stealth cloaks.

### 5.4 Semi-AI (Primitive)
* **IFF:** Identification Friend or Foe accuracy.
* **Reaction Bonus:** Reduces latency in "If-Then" routine execution.
* **Swarm Communication:** Enables coordination between multiple shurikens.

### 5.5 Sensors
Sensors unlock specific "IF" triggers:
* **Biosensors:** Detect organic/living targets.
* **EM-Sensors:** Detect energy fields, shields, and synthetic targets.
* **Radar:** Long-range monitoring, susceptible to decoys.
* **Lidar:** High-precision optical targeting for critical hits.
* **Terahertz:** Penetrates physical obstacles; detects enemies behind cover.

### 5.6 Blades & Edges
* **Standard Sharpening:** Basic slash damage.
* **Blunt / Hammer Profile:** Kinetic damage to crush heavy armor.
* **Vibro-Blade:** High-frequency vibration to saw through medium armor.
* **Monofilament Wire:** Ignores armor almost entirely; extremely fragile.
* **Energy/Plasma Blade:** Highly effective against shields and heavy plating; high power draw.

## 6. Enemy Design & Counters
* **EMP Grenadiers:** Force players to invest in EM-hardening or interception routines.
* **Shield Bearers:** Require shield-breaker routines (Plasma or Heavy Blunt).
* **Hacker Drones:** Temporarily invert routine priorities.
* **Snipers:** Force defensive "Bodyguard" behavior.

## 7. The Workshop (Meta-Progression)
* **Repair Deck:** NPC Mechanics (Ripperdocs) improve nanite efficiency.
* **Server Room:** Netrunners unlock additional Gambit slots and improve AI processing speed.
* **Genesis Chamber:** A high-tech lab to research new alloys (e.g., Neutronium) and energy tech.

## 8. Setting & Art Direction
* **Visual Style:** "Used Future" Cyberpunk. Dark grime vs. vibrant neon.
* **Shuriken Design:** High-tech flying discs with visible circuit boards, glowing plasma edges, and micro-thrusters.
* **UI/UX:** Phase 1 resembles a hacking terminal or holographic blueprint table.

## 9. Monetization (Fair & Cosmetic)
* **Skins:** Cyberpunk-themed visuals (Neon-discs, Chrome-sawblades).
* **Particle Effects:** Engine trails (e.g., Red Plasma, Glitch trails).
* **Hub Customization:** Cosmetic decorations for the underground workshop.
