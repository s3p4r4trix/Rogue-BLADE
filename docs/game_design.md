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
* **Auto-Scrap Filter (QoL):** To prevent loot fatigue on mobile devices, players can configure auto-scrap rules in the workshop (e.g., "Automatically scrap all Common Tier I Hulls"). This converts trash loot directly into raw materials without cluttering the inventory.
* **Scrapping & Selling:** The inventory is limited. Unwanted or obsolete hardware parts can be sold to black-market NPCs for "Credits" or scrapped down into raw materials to fuel the Genesis Chamber research.

## 5. The Software System (Gambit UI)
* **The Slot-based Gambit System** is the core mechanic for programming AI behavior.
* **Priority:** The vertical order of slots determines the importance of actions.
* **Action Fallbacks:** If an IF condition is met, but the THEN action cannot be executed (e.g., insufficient energy for a Kinetic Ram), the system automatically skips the action and evaluates the next slot in the priority list.
* **Default Slot:** To prevent drones from idling due to poor programming, every Shuriken has a hidden, uneditable final slot: "IF Enemy Exists -> THEN Standard Strike".
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
    * **reqSensor:** EM-Scanner (DEFERRED)
    * **logic:** Currently returns false (Shields disabled in prototype).

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
    * **behavior:** Maximizes acceleration toward the target to maximize the momentum multiplier.
    * **energyCost:** 20

* **`actionEvasiveManeuver`** (Designation: **Execute: Evasive Action**)
    * **behavior:** Briefly increases evasionRate to Max Cap (75%) and moves erratically. Cancels current attack.
    * **energyCost:** 15

* **`actionApplyMark`** (Designation: **Execute: Apply Mark**)
    * **behavior:** Attacks with the intent to apply the "Marked" status effect instead of dealing max damage.
    * **energyCost:** 5

* **`actionDefendAlly`** (Designation: **Execute: Defend Ally**)
    * **behavior:** Repaths to orbit the nearest allied Shuriken (or the player's core) to intercept incoming attacks (this will parry attacks with the equipped blade and result in small amounts of damage to the defender).
    * **energyCost:** 0

* **`actionActivateCloak`** (Designation: **Execute: Ghost Protocol**)
    * **behavior:** Consumes energy per second to push stealthValue to maximum, making the Shuriken very hard to detect by normal enemies.
    * **energyCost:** 10 per second

* **`actionEmergencyReboot`** (Designation: **Execute: Emergency Reboot**)
    * **behavior:** Drone stand still for 3 seconds. During this time, the drone is **prone** to damage and enemy tracking but has 30% of maximum energy after this period.
    * **energyCost:** 0

* **`actionEmergencyWithdrawal`** (Designation: **Execute: Emergency Withdrawal**)
    * **behavior:** Moves to the furthest possible edge of the combat zone away from the highest density of enemies to regenerate shields/HP.
    * **energyCost:** 0

## 6. Hardware System

### 6.1 Anti-Grav Engines
* **Speed:** Maximum flight velocity.
* **Stealth (Acoustic/EM/IR):** Reduces engine noise and thermal radiation. High levels enable silent movement to evade alien sensors.
* **Energy Consumption:** Power draw during operation.
* **Flux Capacitor:** Enables rapid direction changes and high-speed parrying.
* **Component Mass:** Every piece of hardware (Engines, Blades, Sensors, etc.) contributes to the overall weight of the Shuriken. Players must balance power vs. mobility.

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
* **Adamant-Quantum-Grid:** Atoms bound by quantum entanglement. Physically extremely hard to break or cut.
* **Aetherium:** Exists partially out of phase. Attacks simply pass through or are diverted to a micro-dimension.

### 6.3 Energy Systems
* **Energy Cell (The Battery):** Defines the **Capacity** (total energy stored) and **Max Output** (required for burst maneuvers).
* **Reactor (The Engine):** Defines the **Regeneration** speed (charging speed during combat). Higher-tier reactors can sustain heavy energy blades and shields indefinitely.

### 6.4 Semi-AI (The Brain - OPTIONAL)
*   **Unlocked Later:** This slot is optional. Early-game drones are "Dumb" (Solo).
*   **Master Status:** Equipping a Semi-AI makes the Shuriken a **Swarm Master**.
*   **Slave Management:** Masters can be linked to other "Dumb" Shurikens (Slaves).
*   **IFF & Reactions:** Slaves utilize the Master's advanced IFF accuracy and receive coordination buffs.
*   **Processor Boost:** Semi-AI hardware features dedicated neural pathways that boost the Processor's reaction time (latency reduction).
*   **Swarm Communication:** Coordination requires a Master.

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
* **Shuriken:** The basic, well-rounded design. Balanced aerodynamics; specializes in cutting damage. (Starting Chassis)
* **Disc:** A well-rounded design. Balanced aerodynamics; specializes in kinetic damage. (Available for purchase)
* **Dagger:** A sleek, aerodynamic form optimized for high-speed linear strikes. Specializes in piercing damage and armor penetration. (Available for purchase)
* **Sphere:** A dense, solid construct that sacrifices edge for sheer mass. Specializes in blunt force trauma and crushing damage. (Available for purchase)
* **Ion-Edge:** A specialized disc featuring a high-energy/plasma perimeter. Deals intense burning damage and is highly effective against energy shields. (Available for purchase)

## 7. Enemy Design: The Zenith Collective & Sensor Counters
The Zenith Collective and their assimilated troops demand specific programming:
* **Zenith EMP-Wardens:** Disable shurikens temporarily (requires Emergency Reboot/EM-Hardening).
* **Phalanx Drones (Shield Bearers):** Alien defenders that require specific shield-breaker routines (Plasma/Heavy Blunt).
* **Corrupted Netrunners:** Human traitors who invert or scramble your priority lists.
* **Illusion Constructs:** Drop chaff and fog to blind Radar and Lidar.
* **Snipers:** Glass canons with high-damage, long-range attacks.

### 7.1 Enemy AI Behavior & Combat Protocols
Zenith forces utilize advanced tactical protocols when engaging human resistance drones:
*   **Target Acquisition:** Upon detecting a drone (Sensor Range + LOS), the unit immediately halts all movement to stabilize weapon systems.
*   **Ranged Engagement:** Hostiles fire high-velocity energy projectiles at the target. This stationary posture maximizes accuracy but makes them vulnerable to high-speed kinetic strikes.
*   **Suppression:** Projectiles deal flat damage upon impact. Drones must utilize speed, evasion, or cover to survive the incoming fire.
*   **Reactive Awareness:** All entities (Drones and Zenith) immediately register the direction and position of any attacker upon taking damage, preventing stealth-kill loops without consequences.

**Specific Counters to Sensors:**
* **Necro-Cyborgs / Drones:** Invisible to **Biosensors**.
* **Stealth-Mechs:** Zero-emission tech; invisible to **EM-Sensors**.
* **Chaff-Drones:** Release clouds to confuse **Radar**.
* **Smoke-Generators:** Block/refract **Lidar** lasers.
* **Lead-Armor Brutes:** Absorb/block **Terahertz** waves.

## 7.1 Onboarding & Early-Game Balancing
To ensure a smooth player onboarding experience, the first successful Liberation Strike utilizes a simplified combat profile:
* **Target Resistance:** Forced to `UNARMORED`.
* **Shields:** Disabled (0) - Mechanics deferred for prototype stability.
* **Armor Value:** Disabled (0) - Calculations simplified.
* **Duration:** Shorter (approx. 30-45 seconds).
This allows players to validate their basic "If-Then" routines and see significant impact (30+ damage per hit) before facing Zenith defensive tech like Shields and Heavy Armor.

## 8. The Workshop (Meta-Progression)
* **Repair Deck & NPC Mechanic:** Upgrading them increases Nanite speed or reduces Polymer costs.
* **Server Room & NPC Programmer:** Upgrading them unlocks more Gambit slots and reduces reaction latency.
* **Genesis Chamber (Research Lab):** Reverse-engineer new alloys, components and AIs.

## 9. Setting & Art Direction
* **Visual Style:** A stark contrast. The underground human resistance base is dirty, wet, and lit by flickering neon ("Used Cyberpunk"). The alien-occupied surface is sterile, brightly glowing, geometrically perfect, and threateningly clean.
* **Drone Design:** High-tech flying drones with visible circuit boards and glowing energy edges.
* **UI/UX:** Hacking terminal aesthetic with holographic grids and fonts.
* **Readability (Visual Noise Reduction):** To prevent visual clutter on small screens during the **visual auto-battler phase**, standard floating damage numbers are hidden. The game relies on Macro-Visuals (Crits/Shield-breaks) for the battlefield overlay. However, the **Live Feed (Technical Log)** must always display all data for player analysis.
* **Kinetic & Energy Feedback:** Heavy impacts cause subtle camera shake, while fast, light attacks trigger sharp, bright hit-sparks.
* **Audio Design:** High-fidelity sound effects with distinct audio cues for each drone type and weapon impact.

## 10. Monetization (Fair & Cosmetic)
* **Drone Skins:** Holographic Zenith-Skins, rusty Punk-Skins, Ancient Chakrams.
* **Particle Trails:** Engine exhaust (e.g., Red Rebellion Plasma vs. Cold Alien Blue, Digital Glitch).
* **Hub Customization:** Cosmetic upgrades for the player's basement workshop.

## 11. Future Expansion Plans

### 11.1 Drone Experience Pool (RPG Mechanics)
(Design Note: Scheduled for implementation after the core combat and ARPG loot loops are fully validated).

To foster player attachment to specific drones within their swarm, each drone will feature an internal **Nanite Pool** that functions as an Experience (XP) system.
* **Gaining XP:** After defeating an enemy or successfully completing a strike, the drone earns experience, feeding the Nanites.
* **Leveling Up:** When the XP pool reaches a threshold, the drone levels up.
* **Stat Boosting:** Upon leveling, the player can permanently boost one of the drone's overall base stats. Selectable boosts include: baseDamage, critChance, critMultiplier, energyRegen, maxEnergy, armorValue, evasionRate, stealthValue, baseWeight, topSpeed, and acceleration.

### 11.2 Modular Chassis System (Advanced Drone Building)
Instead of fixed slots (1 Engine, 1 Sensor, etc.), advanced chassis forms will feature a limited "Space" system.
* **Niche Specialization:** Players can sacrifice standard components to build highly specialized drones. For example, slotting two Grav-Engines and zero Sensors to create an ultra-fast, "dumb" kinetic battering ram, or utilizing multiple Processors and Sensors for a slow, highly intelligent command drone.
* **The Balancing Act:** The player must balance physical space, energy consumption, and weight limitations to ensure the drone can still fly.
* **UI/UX Consideration:** Shelved for post-launch because introducing this too early would heavily complicate inventory management and overwhelm new players on a mobile screen.

## 12. Development Status (Rogue OS Refinement)
*   **[x] Tactical Naming:** Conditions and Actions use player-friendly tactical terminology.
*   **[x] System Reference v2:** Integrated "Tactical Wiki" with real-time search and auto-diagnostic display.
*   **[x] Smart Onboarding:** New shurikens are pre-loaded with a "Standard Tactical Routine" (Close Proximity Strike / Long Range Ram).
*   **[x] Tactical Map (2D Arena):** Canvas-based combat arena with 3/4 perspective, Y+Z depth sorting, and real-time AI visualization.
*   **[ ] Combat Latency UI:** Visualization of effective latency based on hardware weight/acceleration in the Routine Compiler.

## 13. 2D Combat Arena (Active Combat Prototype)

### 13.1 Overview
The Liberation Strike's **Phase 2 (Passive)** is accompanied by a **Tactical Map** – a 2D combat arena that visually represents the spatial battlefield. The player can toggle between the **Live Feed** (text log) and the **Tactical Map** (arena view) during a strike using a button in the War Room header.

### 13.2 Rendering & Perspective
*   **3/4 Top-Down View:** The arena is rendered from a slightly angled perspective. Entities are drawn as ellipses (squashed circles) to simulate depth.
*   **Free 360° Movement:** Drones move freely in continuous 2D space (not grid-locked), enabling smooth flying and orbiting.
*   **Y-Sorting with Z-Axis:** Entities are depth-sorted by their Y-coordinate combined with their Z (elevation) value. Higher Y = further forward. Higher Z = hovering above.
*   **Drop Shadows:** Flying drones cast a semi-transparent shadow at their ground position `(x, y)`, while their sprite renders at `(x, y - z)` to simulate altitude.

### 13.3 Arena & Obstacles
*   **Walled Arena:** An 800x800 unit arena bounded by solid walls.
*   **Cover Objects:** 3-4 solid rectangular obstacles placed in the interior. These block both physical movement (collision) and vision (raycasts).

### 13.4 AI Movement Behaviors
These are the core spatial behaviors mapped to existing GDD actions:
*   **Pursuit (Standard Strike):** Drone moves in a straight line toward its visible target with smooth acceleration. Requires active sensor lock.
*   **Fighting (Active Strike):** High-intensity engagement when in melee range, at strike velocity, and with clear LOS. Prioritizes direct, aggressive movement to impact the target.
*   **Steering & Obstacle Avoidance:** Units project "feelers" to detect upcoming collisions and apply steering forces to navigate around cover without losing momentum.
*   **Orbit (Repositioning):** Drone maintains a fixed radius around the target and continuously rotates. Used after a strike to build speed for the next pass or when waiting for cooldowns.
*   **Flee (Emergency Withdrawal):** Triggered when a human resistance drone's HP drops below 20%. Zenith hostiles are expendable and never flee, fighting until destroyed. The drone calculates the vector away from the nearest enemy and moves toward the nearest arena boundary.
    *   **Disengagement:** Upon reaching the arena edge, the drone must remain there for **2 seconds** without being destroyed.
    *   **Exit:** After the 2-second hold, the drone leaves the combat zone (state: `WITHDRAWN`). This preserves the hardware for future missions at a significantly lower repair cost compared to full destruction.
    *   **Mission End:** If all drones are either `WITHDRAWN` or `DESTROYED`, the mission ends in failure (unless the objective was already met).
*   **Search (LOS Lost):** When an enemy disappears behind cover, the drone navigates to its **last-seen position** and performs an expanding spiral search while scanning its FOV. After a set time (`SEARCH_LINGER_TIME = 3s`), the last-seen memory is cleared and the drone falls back to patrolling.
*   **Patrol (Idle Movement):** When no target is known or seen (common at mission start), the unit moves at 100% top speed between random waypoints, actively scanning its surroundings with its sensors.
*   **Idle (Observation):** Stationary state where the unit rotates its sensors/FOV to scan for incoming threats.

### 13.4.1 Minimum Strike Velocity
Drones must reach a minimum speed threshold (`MIN_STRIKE_SPEED = 40%` of `topSpeed`) before they can execute a strike. This prevents drones from circling endlessly at low speed without meaningful engagement. After a successful strike, the drone bounces away, naturally resetting its orbit for another high-speed pass.

*   **Strike Cooldown:** After each hit, a cooldown (`STRIKE_COOLDOWN = 1.0s`) prevents rapid repeated strikes.
*   **Visual Indicator:** A ⚡ icon appears next to the drone's state label when it has reached strike-ready velocity.

### 13.5 Sensors & Spatial Detection
*   **Radius Checks:** Euclidean distance checks for Radar range (120 units) and Melee range (20 units).
*   **Line of Sight (LOS):** A parametric raycast from the drone to its target. If the ray intersects any obstacle AABB, the target is considered **obscured** (behind cover). This directly maps to the `ifEnemyBehindCover` trigger. **Terahertz Sensors** bypass this check, maintaining a lock through solid objects.
*   **Lock-on Requirement:** Drones do not start with knowledge of enemy positions. They must achieve a sensor lock (within range + LOS) to begin offensive behaviors.
*   **Last-Seen Memory:** When a drone has clear LOS, it continuously updates a `lastSeenPos` coordinate. When LOS is lost, this memory drives the SEARCHING behavior.

### 13.6 Visual Feedback & Debugging
Since this is an AI-driven game, the Tactical Map includes comprehensive visual feedback:
*   **Hit Flash VFX:** When a drone strikes the enemy, the target flashes white with an expanding ring effect (200ms duration).
*   **Sensor Range Wireframe:** A faint, dashed ellipse around each drone showing its current detection radius. For standard sensors, this ellipse is **clipped by obstacles** via raycasting. Terahertz sensors display a full, unclipped ellipse to visualize their penetration capability.
*   **LOS Raycast Line:** A line drawn from each drone to its target. Colored **Green** if LOS is clear, **Red** if blocked by cover, with a midpoint status label.
*   **State Labels:** A small text label above each unit displaying its current AI state (e.g., `PURSUING`, `ORBITING`, `FIGHTING`, `SEARCHING`, `PATROLLING`).
*   **Last-Seen Marker:** When a drone is in SEARCHING state, a yellow crosshair appears at the last-known enemy position with a dashed line from the drone.
*   **Melee Range Indicator:** A smaller yellow wireframe showing the close-combat engagement zone.
*   **Enemy Vision Cone:** A faint red polygon representing the hostile entity's 120-degree field of view, dynamically clipped by cover objects.
*   **Sensor Link:** A tactical line connecting drones to their targets when within sensor range, indicating signal strength (solid/cyan for clear, dashed/red for obscured).

### 13.7 Live Feed & Telemetry Synchronization
The Tactical Map, Live Feed, and Sidebar Telemetry are synchronized via a centralized **CombatStore** (NgRx SignalStore):
*   **CombatStore**: Acts as the single source of truth for the active battle state (Enemy HP, Squad Vitals, Logs).
*   **Real-time Updates**: The `CombatArena` updates the store directly during its physics tick (0.2s sync) and upon events (damage, strikes, state changes).
*   **Reactive UI**: The `StrikeReport` and its tactical sidebar reactively display the store's signals. This eliminates the need for log-parsing and ensures 100% telemetry accuracy regardless of which view is active.
*   **Event Bridge**: While the store handles the state, the arena still emits log events (`arenaLog`) for legacy compatibility and sequential log processing.
