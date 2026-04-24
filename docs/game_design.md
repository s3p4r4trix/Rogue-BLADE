# Game Design Document: Rogue:BLADE (Mobile / Auto-Battler)

## 1. Lore & Storyline (The Conflict)
Earth has fallen. The **"Zenith Collective"** – a highly advanced, interstellar race – conquered the planet in a devastating blitzkrieg. Human mega-cities are now controlled by massive alien monoliths and drone swarms. The remnants of humanity have retreated into abandoned subway systems and underground bunkers.
The player takes on the role of a brilliant cyber-engineer of the last human resistance. From a damp underground workshop in the beginning, you build, program, and reverse-engineer "Smart-Shurikens" – autonomous, silent blade-drones designed to strike the Zenith Collective from the shadows and liberate the mega-city, sector by sector.

## 2. Core Concept & Game Idea
"Rogue:BLADE" is a strategic mobile auto-battler with roguelite elements set in a dystopian cyberpunk world under alien occupation. The game centers on **Smart-Shuriken** – flying, drone-like projectile weapons. Players spend their active time in an underground workshop programming, repairing, and upgrading these shurikens using scavenged and alien tech. Combat is passive: players watch their creations autonomously navigate procedurally generated levels and fight waves of Zenith security, assimilated gangs, and alien robots.

## 3. The Mobile Gameplay Loop
The game is optimized for short "on-the-go" sessions. The loop is divided into two distinct phases:

* **Phase 1: The Resistance Base (Active - Management & Tactics)**
    * **Routine Building:** Configuring "If-Then" logic blocks (Rogue System).
    * **Hardware Tuning & Reverse-Engineering:** Customizing engines, materials, blades, cells, sensors, and chassis forms.
    * **Maintenance:** Choosing between passive (Nanites) or active (Polymer) repair.
    * **Workshop Management:** Progression through rescuing NPCs (Mechanics, Hackers) and unlocking the Genesis Chamber.

* **Phase 2: The Liberation Strike (Passive - Observe & Learn)**
    * **Path Selection:** Choosing a route through the occupied city (Patrols, Alien Depots, SOS-Signals, Bosses) similar to "Slay the Spire."
    * **Execution:** Shurikens act 100% autonomously based on Phase 1 programming.
    * **Learning Effect:** Players analyze failures against Zenith technology and adapt their routines for the next run.

## 4. The Software System (Rogue-BLADE Logic System)
The **Slot-based Rogue-BLADE Logic System** is the core mechanic for programming AI behavior. The system is designed to be simple enough for mobile play but complex enough to allow for strategic depth. Trigger can be research

* **Trigger (IF):** e.g., "Enemy in range," "Enemy has Energy Shield > 0%", "Self HP < 20%", "Enemy status: Marked", "Self status: Undetected." (Note: Many triggers require specific sensors).
* **Action (THEN):** e.g., "Parry," "Kinetic Ram," "Guard Character," "Mark Target," "Ambush Strike (Critical)."
* **Priority:** The vertical order of slots determines the importance of actions.
* **Synergies:** Players can assign roles. For example, a "Marker" shuriken applies debuffs, while a "Striker" shuriken attacks only marked targets. Shuriken with an advanced AI installed can delegate tasks to other simple shurikens in the swarm and change their priorities on the fly. Shuriken without an AI can only perform basic attacks and can be assigned specific attacks based on the type of enemy in range.

## 5. Maintenance & Economy
Shurikens take damage during runs but are automatically teleported back to the HQ before being permanently destroyed to avoid player frustration.
* **Passive Repair (Nanites):** Restores durability slowly over real time.
* **Active Repair (Polymer):** Costs scavenged "Credits" or "Polymer Solution" for instant 100% restoration.
* **Scaling:** Players start with one rusty, scrap-built shuriken and gradually build a full resistance swarm.

## 6. Hardware System

### 6.1 Anti-Grav Engines
* **Speed:** Maximum flight velocity.
* **Stealth (Acoustic):** Reduces engine noise and thermal signature. High levels enable silent movement to evade alien sensors.
* **Energy Consumption:** Power draw during operation.
* **Flux Capacitor:** Enables rapid direction changes and high-speed parrying.

### 6.2 Hull Materials (Lore-Integrated Tiered Progression)
**Tier I: Remnants of Humanity (Weak & Common)**
1.  **Sinter-Scrap:** Cheap, compressed junk. Fragile and brittle.
2.  **Plasteel:** Lightweight polymer-metal mix. Good against basic projectiles.
3.  **Poly-Titanium:** Titanium with carbon nanotubes. High strength-to-weight ratio.

**Tier II: Pre-Invasion Military Tech (Solid & Rare)**
4.  **Durasteel:** Old industrial standard. Heavy, heat-resistant, and extremely tough.
5.  **Tritanium:** Crystalline alloy used in fallen starships. High density, resists plasma.
6.  **Kinetic-Graphene (Reactive Metal):** Flexible until impact; hardens in microseconds upon hit.

**Tier III: Reverse-Engineered Zenith Tech (Exotic & God-Tier)**
7.  **Null-Field Steel:** Extracted from alien drones. Absorbs/dissipates energy (Plasma/Lasers).
8.  **Neutronium-Cast:** Extremely dense material from dead stars. Near-indestructible but requires elite engines to fly.
9.  **Adamant-Quantum-Grid:** Atoms bound by quantum entanglement. Physically impossible to break or cut.
10. **Singularity Matrix (Aetherium):** Exists partially out of phase. Attacks simply pass through or are diverted to a micro-dimension.

### 6.3 Energy Cells
* **Capacity:** Total energy stored.
* **Regeneration:** Charging speed during combat.
* **Max Output:** Required for burst maneuvers or cloaking devices.

### 6.4 Processor (Compute / Logic)
* **Routine Capacity:** Determines the maximum number of available Gambit Slots.
* **Latency Modifier:** Modifies the base processing time of routines (in milliseconds). Negative values speed up reactions, positive values add hesitation.

#### Combat Simulation: The "Cycle Latency" Mechanic
In the 2D auto-battler, a Shuriken doesn't just attack instantly; it has a calculation phase.
* **Routine Cost (Thinking):** Every programmed Gambit slot adds a fixed base execution latency (e.g., +20ms). A complex 8-rule drone takes longer to "decide" its next move than a simple 1-rule drone.
* **Action Cost (Doing):** Actions have their own spool-up latency (e.g., "Evasive Dash" takes 20ms, "Charge Plasma Edge" takes 300ms).
* **The Processor:** The Processor chip applies its `Latency Modifier` to this total. A junk processor adds delays, causing the drone to pause vulnerably in combat. An elite quantum processor provides a massive negative modifier, allowing the drone to calculate complex routines instantly.

### 6.5 Semi-AI (The Brain / Personality)
* **IFF:** Identification Friend or Foe accuracy.
* **Behavior Buff:** Passive behavioral modifiers (e.g., Aggressive vs. Defensive pathing).
* **Swarm Communication:** Coordination (e.g., "If Shuriken A attacks, Shuriken B flanks").

### 6.6 Sensors (Unlocking Triggers)
* **Biosensors:** Detect organic targets.
* **EM-Sensors:** Detect energy fields, Zenith shields, and electronics.
* **Radar:** Long-range monitoring; susceptible to chaff.
* **Lidar:** Precision optical targeting for critical hits.
* **Terahertz:** Penetrates physical obstacles (detects enemies behind walls).

### 6.6 Blades & Edges
* **Sharpened Edge:** Standard slash damage against soft targets.
* **Blunt / Hammer Profile:** High kinetic damage to crush heavy armor/alien mechs.
* **Vibro-Blade:** High-frequency vibration to saw through medium armor.
* **Monofilament Wire:** Molecularly sharp; ignores armor but is extremely fragile.
* **Energy/Plasma Blade:** Required to melt Zenith energy shields and heavy plating; massive power draw.

### 6.7 Form Designs (Chassis Shape)
Determines the overall physical shape and combat specialization of the Shuriken.
* **Standard Disc:** The basic, well-rounded design. Balanced aerodynamics; specializes in cutting damage.
* **Dagger:** A sleek, aerodynamic form optimized for high-speed linear strikes. Specializes in piercing damage and armor penetration.
* **Sphere:** A dense, solid construct that sacrifices edge for sheer mass. Specializes in blunt force trauma and crushing damage.
* **Tron-Disc (Energy Edge):** A specialized disc featuring a high-energy/plasma perimeter. Deals intense burning damage and is highly effective against energy shields.

## 7. Enemy Design: The Zenith Collective & Sensor Counters
The Zenith Collective and their assimilated troops demand specific programming:
* **Zenith EMP-Wardens:** Disable shurikens temporarily (requires Reboot/EM-Hardening routines).
* **Phalanx Drones (Shield Bearers):** Alien defenders that require specific shield-breaker routines (Plasma/Heavy Blunt).
* **Corrupted Netrunners:** Human traitors who invert or scramble your priority lists.
* **Illusion Constructs:** Drop chaff and fog to blind Radar and Lidar.
* **Snipers:** Require defensive "Bodyguard" programming.

**Specific Counters to Sensors:**
* **Necro-Cyborgs / Drones:** Invisible to **Biosensors**.
* **Stealth-Mechs:** Zero-emission tech; invisible to **EM-Sensors**.
* **Chaff-Drones:** Release clouds to confuse **Radar**.
* **Smoke-Generators:** Block/refract **Lidar** lasers.
* **Lead-Armor Brutes:** Absorb/block **Terahertz** waves.

## 8. The Workshop (Meta-Progression)
* **Repair Deck & NPC Mechanic:** A rescued "Ripperdoc" for drones. Upgrading them increases Nanite speed or reduces Polymer costs.
* **Server Room & NPC Programmer:** Netrunners who hack the Zenith network. Upgrading them unlocks more Gambit slots and reduces reaction latency.
* **Genesis Chamber (Research Lab):** Turn in alien "Scrap" to reverse-engineer Tier III materials, new alloys, and high-efficiency cells.

## 9. Setting & Art Direction
* **Visual Style:** A stark contrast. The underground human resistance base is dirty, wet, and lit by flickering neon ("Used Cyberpunk"). The alien-occupied surface is sterile, brightly glowing, geometrically perfect, and threateningly clean.
* **Shuriken Design:** High-tech flying drones with visible circuit boards, glowing plasma edges, and micro-thrusters.
* **UI/UX:** Hacking terminal aesthetic with holographic grids and terminal fonts.

## 10. Monetization (Fair & Cosmetic)
* **Shuriken Skins:** Holographic Zenith-Skins, rusty Punk-Skins, Ancient Chakrams.
* **Particle Trails:** Engine exhaust (e.g., Red Rebellion Plasma vs. Cold Alien Blue, Digital Glitch).
* **Hub Customization:** Cosmetic upgrades for the player's basement workshop.