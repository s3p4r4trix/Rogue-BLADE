# Game Design Document: Rogue:BLADE (Mobile / Auto-Battler)

## 1. Core Concept & Game Idea
"Rogue:BLADE" is a strategic mobile auto-battler with roguelite elements set in a dystopian cyberpunk world. The game centers on **Smart-Shuriken** – flying, drone-like projectile weapons. Players spend their active time in an underground workshop programming, repairing, and upgrading these shurikens. Combat is passive: players watch their creations autonomously navigate procedurally generated levels and fight waves of corporate security, gangs, and robots.

## 2. The Mobile Gameplay Loop
The game is optimized for short "on-the-go" sessions. The loop is divided into two distinct phases:

* **Phase 1: The Base (Active - Management & Tactics)**
    * **Routine Building:** Configuring "If-Then" logic blocks (Gambit System).
    * **Hardware Tuning:** Customizing engines, materials, blades, energy cells, and sensors.
    * **Maintenance:** Choosing between passive (Nanites) or active (Polymer) repair.
    * **Workshop Management:** Progression through NPC interaction and the Genesis Chamber.

* **Phase 2: The Run (Passive - Observe & Learn)**
    * **Path Selection:** Choosing a route through the level (Combat, Elite, Merchant, Repair) similar to "Slay the Spire."
    * **Execution:** Shurikens act 100% autonomously based on Phase 1 programming.
    * **Learning Effect:** Players analyze failures and adapt their routines for the next run.

## 3. The Software System (Gambit UI)
The **Slot-based Gambit System** is the core mechanic for programming AI behavior.

* **Trigger (IF):** e.g., "Enemy in range," "Enemy has shield," "Self HP < 20%," "Enemy status: Marked," "Self status: Undetected." (Note: Many triggers require specific sensors).
* **Action (THEN):** e.g., "Parry," "Kinetic Ram," "Guard Character," "Mark Target," "Ambush Strike (Critical)."
* **Priority:** The vertical order of slots determines the importance of actions.
* **Synergies:** Players can assign roles. For example, a "Marker" shuriken applies debuffs, while a "Striker" shuriken attacks only marked targets.

## 4. Maintenance & Economy
Shurikens take damage during runs but are never permanently destroyed to avoid player frustration.
* **Passive Repair (Nanites):** Restores durability slowly over real time.
* **Active Repair (Polymer):** Costs "Credits" or "Polymer Solution" for instant 100% restoration.
* **Scaling:** Players start with one shuriken and gradually purchase/build a full swarm.

## 5. Hardware System

### 5.1 Anti-Grav Engines
* **Speed:** Maximum flight velocity.
* **Stealth (Acoustic):** Reduces engine noise and thermal signature. High levels enable silent movement.
* **Energy Consumption:** Power draw during operation.
* **Flux Capacitor:** Enables rapid direction changes and high-speed parrying.

### 5.2 Hull Materials (Tiered Progression)
**Tier I: Weak & Common**

1.  **Sinter-Scrap:** Cheap, compressed junk. Fragile and brittle.
2.  **Plasteel:** Lightweight polymer-metal mix. Good against basic projectiles.
3.  **Poly-Titanium:** Titanium with carbon nanotubes. High strength-to-weight ratio.

**Tier II: Solid & Military**

4.  **Durasteel:** Industrial standard. Heavy, heat-resistant, and extremely tough.
5.  **Tritanium:** Crystalline alloy used in starships. High density, resists plasma.
6.  **Kinetic-Graphene (Reactive Metal):** Flexible until impact; hardens in microseconds upon hit.

**Tier III: Exotic & God-Tier**

7.  **Null-Field Steel:** Forged in a vacuum. Absorbs/dissipates energy (Plasma/Lasers).
8.  **Neutronium-Cast:** Extremely dense material from dead stars. Near-indestructible but requires elite engines to fly.
9.  **Adamant-Quantum-Grid:** Atoms bound by quantum entanglement. Physically impossible to break or cut.
10. **Singularity Matrix (Aetherium):** Exists partially out of phase. Attacks simply pass through or are diverted to a micro-dimension.

### 5.3 Energy Cells
* **Capacity:** Total energy stored.
* **Regeneration:** Charging speed during combat.
* **Max Output:** Required for burst maneuvers or cloaking devices.

### 5.4 Semi-AI (The Brain)
* **IFF:** Identification Friend or Foe accuracy.
* **Reaction Bonus:** Reduces latency in "If-Then" routine execution.
* **Swarm Communication:** Coordination (e.g., "If Shuriken A attacks, Shuriken B flanks").

### 5.5 Sensors (Unlocking Triggers)
* **Biosensors:** Detect organic targets.
* **EM-Sensors:** Detect energy fields, shields, and electronics.
* **Radar:** Long-range monitoring; susceptible to chaff.
* **Lidar:** Precision optical targeting for critical hits.
* **Terahertz:** Penetrates physical obstacles (detects enemies behind walls).

### 5.6 Blades & Edges
* **Sharpened Edge:** Standard slash damage against soft targets.
* **Blunt / Hammer Profile:** High kinetic damage to crush heavy armor.
* **Vibro-Blade:** High-frequency vibration to saw through medium armor.
* **Monofilament Wire:** Molecularly sharp; ignores armor but is extremely fragile.
* **Energy/Plasma Blade:** Best against shields and heavy plating; massive power draw.

## 6. Enemy Design & Sensor Counters
* **EMP Grenadiers:** Disable shurikens temporarily (requires Reboot/EM-Hardening).
* **Shield Bearers:** Require specific shield-breaker routines.
* **Hacker Drones:** Invert or scramble priority lists.
* **Snipers:** Require defensive "Bodyguard" programming.

**Specific Counters to Sensors:**
* **Necro-Cyborgs / Drones:** Invisible to **Biosensors**.
* **Stealth-Mechs:** Zero-emission tech; invisible to **EM-Sensors**.
* **Chaff-Drones:** Release clouds to confuse **Radar**.
* **Smoke-Generators:** Block/refract **Lidar** lasers.
* **Lead-Armor Brutes:** Absorb/block **Terahertz** waves.

## 7. The Workshop (Meta-Progression)
* **Repair Deck & NPC Mechanic:** A "Ripperdoc" for drones. Upgrading them increases Nanite speed or reduces Polymer costs.
* **Server Room & NPC Programmer:** Netrunners who research better AI. Upgrading them unlocks more Gambit slots and reduces reaction latency.
* **Genesis Chamber (Research Lab):** Turn in "Scrap" to research Tier III materials, new alloys, and high-efficiency cells.

## 8. Setting & Art Direction
* **Visual Style:** "Used Future" Cyberpunk. Dark grime vs. vibrant neon.
* **Shuriken Design:** High-tech flying discs with visible circuit boards, glowing plasma edges, and micro-thrusters.
* **UI/UX:** Hacking terminal aesthetic with holographic grids and terminal fonts.

## 9. Monetization (Fair & Cosmetic)
* **Shuriken Skins:** Neon-discs, Chrome-sawblades, Ancient Chakrams.
* **Particle Trails:** Engine exhaust (e.g., Red Plasma, Digital Glitch, Blue Flame).
* **Hub Customization:** Cosmetic upgrades for the player's basement workshop.
