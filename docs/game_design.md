Game Design Document: Rogue:BLADE (Mobile / Auto-Battler)

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

## 4. ARPG Loot System & Economy
Hardware components function similarly to gear in Action RPGs (like Diablo). This creates an addictive "loot hunt" loop.

* **Drops & Rarities:** After successfully completing a strike or defeating elite enemies, players receive hardware drops categorized by rarity (e.g., Common, Uncommon, Rare, Epic, Legendary).
* **Randomized Rolls:** Hardware components drop with randomized stat values within a specific range. Players will constantly hunt for "God Rolls" (e.g., finding two "Tier II Durasteel Hulls," but one rolled with +15% HP and +5 Armor, making it strictly better).
* **Scrapping & Selling:** The inventory is limited. Unwanted or obsolete hardware parts can be sold to black-market NPCs for "Credits" or scrapped down into raw materials (Polymers/Alloys) to fuel the Genesis Chamber research.

## 5. The Software System (Gambit UI)
The **Slot-based Gambit System** is the core mechanic for programming AI behavior.
* **Priority:** The vertical order of slots determines the importance of actions.
* **Synergies:** Players can assign roles. For example, a "Marker" shuriken applies debuffs, while a "Striker" shuriken attacks only marked targets.

### 5.1 Triggers (IF Components)

Every trigger must evaluate to a boolean (true / false). Many triggers are locked unless the specific sensor is equipped in the hardware phase. In the Rogue OS UI, these are presented with tactical designations.

* **`ifEnemyInMeleeRange`** (Designation: **Enemy: Close Proximity**)
    * **reqSensor:** None (Proximity)
    * **logic:** Returns true if an enemy is within collision/strike radius.

* **`ifEnemyInSight`** (Designation: **Enemy: Detected**)
    * **reqSensor:** Radar / Lidar
    * **logic:** Returns true if an enemy is within the global tracking radius.

* **`ifEnemyIsShielded`** (Designation: **Enemy: Shield Active**)
    * **reqSensor:** EM-Scanner
    * **logic:** Returns true if the target has an active Energy Shield.

* **`ifEnemyIsOrganic`** (Designation: **Enemy: Soft Target**)
    * **reqSensor:** Biosensor
    * **logic:** Returns true if the target armor type is UNARMORED/Flesh.

* **`ifEnemyBehindCover`** (Designation: **Enemy: Obscured**)
    * **reqSensor:** Terahertz Array
    * **logic:** Returns true if target is obscured by a wall/obstacle.

* **`ifTargetIsMarked`** (Designation: **Enemy: Marked**)
    * **reqSensor:** None (Reads Swarm Data)
    * **logic:** Returns true if any enemy currently has the 'Marked' status.

* **`ifSelfHpCritical`** (Designation: **Self: Hull Breach**)
    * **reqSensor:** None (Internal System)
    * **logic:** Returns true if currentHp < 20% of maxHp.

* **`ifEnergyHigh`** (Designation: **Self: Power Overload**)
    * **reqSensor:** None (Internal System)
    * **logic:** Returns true if currentEnergy > 80% of maxEnergy.

* **`ifIncomingProjectile`** (Designation: **Self: Incoming Fire**)
    * **reqSensor:** Lidar
    * **logic:** Returns true if an enemy projectile is on a collision course with this Shuriken.

### 5.2 Actions (THEN Components)

Actions dictate the behavior of the Shuriken once a trigger is met. Some actions have specific energy costs or hardware synergies.

* **`actionStandardStrike`** (Designation: **Execute: Standard Strike**)
    * **behavior:** Moves toward the target and executes a standard attack using the equipped blade profile.
    * **energyCost:** 0 (Base cost)

* **`actionKineticRam`** (Designation: **Execute: Kinetic Ram**)
    * **behavior:** Maximizes acceleration in a straight line toward the target to maximize the momentum multiplier.
    * **energyCost:** 15

* **`actionEvasiveManeuver`** (Designation: **Execute: Evasive Action**)
    * **behavior:** Briefly increases evasionRate to 1.0 (100%) and moves erratically. Cancels current attack.
    * **energyCost:** 20

* **`actionApplyMark`** (Designation: **Execute: Apply Mark**)
    * **behavior:** Attacks with the intent to apply the "Marked" status effect instead of dealing max damage.
    * **energyCost:** 5

* **`actionDefendAlly`** (Designation: **Execute: Defend Ally**)
    * **behavior:** Repaths to orbit the nearest allied Shuriken (or the player's core) to intercept incoming attacks.
    * **energyCost:** 0

* **`actionActivateCloak`** (Designation: **Execute: Ghost Protocol**)
    * **behavior:** Consumes energy per second to push stealthValue to maximum, making the Shuriken untargetable by normal enemies.
    * **energyCost:** 10 per second

* **`actionRetreat`** (Designation: **Execute: Emergency Withdrawal**)
    * **behavior:** Moves to the furthest possible edge of the combat zone away from the highest density of enemies to regenerate shields/HP.
    * **energyCost:** 0

## 6. Hardware System

### 6.1 Anti-Grav Engines
* **Speed:** Maximum flight velocity.
* **Stealth (Acoustic):** Reduces engine noise and thermal signature. High levels enable silent movement to evade alien sensors.
* **Energy Consumption:** Power draw during operation.
* **Flux Capacitor:** Enables rapid direction changes and high-speed parrying.

### 6.2 Hull Materials (Lore-Integrated Tiered Progression)
**Tier I: Remnants of Humanity (Weak & Common)**
* **Sinter-Scrap:** Cheap, compressed junk. Fragile and brittle.
* **Plasteel:** Lightweight polymer-metal mix. Good against basic projectiles.
* **Poly-Titanium:** Titanium with carbon nanotubes. High strength-to-weight ratio.

**Tier II: Pre-Invasion Military Tech (Solid & Rare)**
* **Durasteel:** Old industrial standard. Heavy, heat-resistant, and extremely tough.
* **Tritanium:** Crystalline alloy used in fallen starships. High density, resists plasma.
* **Kinetic-Graphene (Reactive Metal):** Flexible until impact; hardens in microseconds upon hit.

**Tier III: Reverse-Engineered Zenith Tech (Exotic & God-Tier)**
* **Null-Field Steel:** Extracted from alien drones. Absorbs/dissipates energy (Plasma/Lasers).
* **Neutronium-Cast:** Extremely dense material from dead stars. Near-indestructible but requires elite engines to fly.
* **Adamant-Quantum-Grid:** Atoms bound by quantum entanglement. Physically impossible to break or cut.
* **Singularity Matrix (Aetherium):** Exists partially out of phase. Attacks simply pass through or are diverted to a micro-dimension.

### 6.3 Energy Cells
* **Capacity:** Total energy stored.
* **Regeneration:** Charging speed during combat.
* **Max Output:** Required for burst maneuvers or cloaking devices.

### 6.4 Semi-AI (The Brain - OPTIONAL)
*   **Unlocked Later:** This slot is optional. Early-game drones are "Dumb" (Solo).
*   **Master Status:** Equipping a Semi-AI makes the Shuriken a **Swarm Master**.
*   **Slave Management:** Masters can be linked to other "Dumb" Shurikens (Slaves).
*   **IFF & Reactions:** Slaves utilize the Master's advanced IFF accuracy and receive coordination buffs.
*   **Swarm Communication:** Coordination (e.g., "If Shuriken A attacks, Shuriken B flanks"). Requires a Master.

### 6.5 Sensors (Unlocking Triggers)
* **Optical Sensors:** Detect enemies in very close proximity (up to 20 meters).
* **Biosensors:** Detect organic targets (up to 40 meters).
* **Thermal Sensors:** Detect heat signatures (infrared) (up to 60 meters).
* **EM-Sensors:** Detect energy fields, Zenith shields, and electronics (up to 80 meters).
* **Radar:** Long-range monitoring; susceptible to chaff (up to 120 meters).
* **Lidar:** Precision optical targeting for critical hits (up to 160 meters).
* **Terahertz:** Penetrates physical obstacles (detects enemies behind walls) (up to 20 meters).

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

## 7.1 Onboarding & Early-Game Balancing
To ensure a smooth player onboarding experience, the first successful Liberation Strike utilizes a simplified combat profile:
* **Target Resistance:** Forced to `UNARMORED`.
* **Shields:** Disabled (0).
* **Armor Value:** Disabled (0).
* **Duration:** Shorter (approx. 30-45 seconds).
This allows players to validate their basic "If-Then" routines and see significant impact (30+ damage per hit) before facing Zenith defensive tech like Shields and Heavy Armor.

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

## 11. Future Expansion: Nanite Experience Pool (RPG Mechanics)
(Design Note: Scheduled for implementation after the core combat and ARPG loot loops are fully validated).

To foster player attachment to specific Shurikens within their swarm, each drone will feature an internal **Nanite Pool** that functions as an Experience (XP) system.
* **Gaining XP:** After defeating an enemy or successfully completing a strike, the Shuriken earns experience, feeding the Nanites.
* **Leveling Up:** When the XP pool reaches a threshold, the Shuriken levels up.
* **Stat Boosting:** Upon leveling, the player can permanently boost one of the Shuriken's overall base stats. Selectable boosts include: baseDamage, critChance, critMultiplier, energyRegen, maxEnergy, armorValue, evasionRate, stealthValue, baseWeight, topSpeed, and acceleration.

## 12. Development Status (Rogue OS Refinement)
*   **[x] Tactical Naming:** Conditions and Actions use player-friendly tactical terminology.
*   **[x] System Reference v2:** Integrated "Tactical Wiki" with real-time search and auto-diagnostic display.
*   **[x] Smart Onboarding:** New shurikens are pre-loaded with a "Standard Tactical Routine" (Close Proximity Strike / Long Range Ram).
*   **[ ] Combat Latency UI:** Visualization of effective latency based on hardware weight/acceleration in the Routine Compiler.