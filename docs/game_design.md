Game Design Document: Rogue:BLADE (Mobile / Auto-Battler)

# 1. Lore & Storyline (The Conflict)

Earth has fallen. The "Zenith Collective" – a highly advanced, interstellar race– conquered the planet in a devastating blitzkrieg. Human mega-cities are nowcontrolled by massive alien monoliths and drone swarms. The remnants of humanityhave retreated into abandoned subway systems and underground bunkers. The playertakes on the role of a brilliant cyber-engineer of the last human resistance.From a damp underground workshop in the beginning, you build, program, andreverse-engineer "Smart-Shurikens" – autonomous, silent blade-drones designed tostrike the Zenith Collective from the shadows and liberate the mega-city, sectorby sector.

# 2. Core Concept & Game Idea

"Rogue:BLADE" is a strategic mobile auto-battler with roguelite elements set ina dystopian cyberpunk world under alien occupation. The game centers onSmart-Shuriken – flying, drone-like projectile weapons. Players spend theiractive time in an underground workshop programming, repairing, and upgradingthese shurikens using scavenged and alien tech. Combat is passive: players watchtheir creations autonomously navigate procedurally generated levels and fightwaves of Zenith security, assimilated gangs, and alien robots.

# 3. The Mobile Gameplay Loop   

The game is optimized for short "on-the-go" sessions. The loop is divided intotwo distinct phases:

*   Phase 1: The Resistance Base (Active - Management & Tactics)
    *   Routine Building: Configuring "If-Then" logic blocks (Rogue System).
    *   Hardware Tuning & Reverse-Engineering: Customizing engines, materials,blades, cells, sensors, and chassis forms.
    *   Maintenance: Choosing between passive (Nanites) or active (Polymer)repair.
    *   Workshop Management: Progression through rescuing NPCs (Mechanics,Hackers) and unlocking the Genesis Chamber.
*   Phase 2: The Liberation Strike (Passive - Observe & Learn)
    *   Path Selection: Choosing a route through the occupied city (Patrols,Alien Depots, SOS-Signals, Bosses) similar to "Slay the Spire."
    *   Execution: Shurikens act 100% autonomously based on Phase 1 programming.
    *   Learning Effect: Players analyze failures against Zenith technology andadapt their routines for the next run.

# 4.  ARPG Loot System & Economy
Hardware components function similarly to gear in Action RPGs (like Diablo).This creates an addictive "loot hunt" loop.

*   Drops & Rarities: After successfully completing a strike or defeating eliteenemies, players receive hardware drops categorized by rarity (e.g., Common,Uncommon, Rare, Epic, Legendary).
*   Randomized Rolls: Hardware components drop with randomized stat valueswithin a specific range.
*   Auto-Scrap Filter (QoL): To prevent loot fatigue on mobile devices, playerscan configure auto-scrap rules in the workshop.
*   Scrapping & Selling: The inventory is limited. Unwanted or obsolete hardwareparts can be sold to black-market NPCs for "Credits" or scrapped.

# 5.  The Software System (Gambit UI)

*   **The Base AI (Hidden Default)**: Before any gambit slots are evaluated, every Shuriken runs a hidden state machine loop (Patrolling -> Pursuing -> Striking -> Fly-by Deflection -> Searching -> Shooting -> Engaging). The drone is fully functional _without_ player programming.

*   **The Override Principle**: The Slot-based Gambit System acts as an override mechanismto interrupt this Base AI. This creates specialized archetypes.
    *   Example "Dagger": IF Self: Energy Low -> THEN Evasive Maneuver.
    *   Example "Sphere": IF Self: Incoming Fire -> THEN Kinetic Ram.
*   **Priority**: The vertical order of slots determines the importance of actions.
*   **Action Fallbacks**: If an IF condition is met, but the THEN action cannot beexecuted (e.g., insufficient energy), the system skips the action and evaluatesthe next slot.
*   **Synergies**: Players can assign roles. For example, a "Marker" shurikenapplies debuffs, while a "Striker" shuriken attacks only marked targets.
    

## 5.1 Triggers (IF Components)

Every trigger must evaluate to a boolean (true / false). Many triggers arelocked unless the specific sensor is equipped in the hardware phase. In theRogue OS UI, these are presented with tactical designations.

*   **ifEnemyInMeleeRange** (Designation: Enemy: Close Proximity )    
    *   reqSensor: None (Proximity)
    *   logic: Returns true if an enemy is within collision/strike radius.
*   **ifEnemyInSight** (Designation: Enemy: Detected )    
    *   reqSensor: Radar / Lidar
    *   logic: Returns true if an enemy is within the 400 unit tracking radius.
*   **ifEnemyIsShielded** (Designation: Enemy: Shield Active )    
    *   reqSensor: EM-Scanner (DEFERRED)
    *   logic: Currently returns false (Shields disabled in prototype).
*   **ifEnemyIsOrganic** (Designation: Enemy: Soft Target )
    *   reqSensor: Biosensor
    *   logic: Returns true if the target armor type is UNARMORED/Flesh.
*   **ifEnemyBehindCover** (Designation: Enemy: Obscured )
    *   reqSensor: Terahertz Array
    *   logic: Returns true if target is obscured by a wall/obstacle.
*   **ifTargetIsMarked** (Designation: Enemy: Marked )    
    *   reqSensor: None (Reads Swarm Data)
    *   logic: Returns true if any enemy currently has the 'Marked' status.
*   **ifSelfHpCritical** (Designation: Self: Hull Breach )    
    *   reqSensor: None (Internal System)
    *   logic: Returns true if currentHp < 20% of maxHp.
*   **ifEnergyHigh** (Designation: Self: Power Overload )
    *   reqSensor: None (Internal System)
    *   logic: Returns true if currentEnergy > 80% of maxEnergy.
*   **ifIncomingProjectile** (Designation: Self: Incoming Fire )
    *   reqSensor: Lidar
    *   logic: Returns true if an enemy projectile is on a collision course withthis Shuriken.

## 5.2 Actions (THEN Components)

Actions dictate the behavior of the Shuriken once a trigger is met. Some actionshave specific energy costs or hardware synergies.

*   **actionStandardStrike** (Designation: Execute: Standard Strike )    
    *   behavior: Moves toward the target and executes a standard attack.
    *   energyCost: 0 (Base cost)
*   **actionKineticRam** (Designation: Execute: Kinetic Ram )
    *   behavior: Maximizes acceleration toward the target to maximize themomentum multiplier.
    *   energyCost: 20
*   **actionEvasiveManeuver** (Designation: Execute: Evasive Action )
    *   behavior: Briefly increases evasionRate to Max Cap (75%) and moveserratically. Cancels current attack.
    *   energyCost: 15
*   **actionApplyMark** (Designation: Execute: Apply Mark )
    *   behavior: Attacks with the intent to apply the "Marked" status effect.
    *   energyCost: 5
*   **actionDefendAlly** (Designation: Execute: Defend Ally )
    *   behavior: Repaths to orbit the nearest allied Shuriken.
    *   energyCost: 0
*   **actionActivateCloak** (Designation: Execute: Ghost Protocol )
    *   behavior: Consumes energy per second to push stealthValue to maximum.
    *   energyCost: 10 per second
*   **actionEmergencyReboot** (Designation: Execute: Emergency Reboot )
    *   behavior: Drone stand still for 3 seconds, heals 30% energy after.
    *   energyCost: 0
*   **actionEmergencyWithdrawal** (Designation: Execute: Emergency Withdrawal )
    *   behavior: Moves to the furthest possible edge of the combat zone awayfrom the highest density of enemies to regenerate shields/HP.
    *   energyCost: 0

# 6.  Hardware System

## 6.1 Anti-Grav Engines

*   **Speed**: Maximum flight velocity.
*   **Stealth (Acoustic/EM/IR)**: Reduces engine noise and thermal radiation.
*   **Component Mass**: Every piece of hardware contributes to the overall weight.

## 6.2 Hull Materials (Lore-Integrated Tiered Progression)

*   **Plasteel**: Lightweight polymer-metal mix. Good against basic projectiles.
*   **Durasteel**: Heavy, heat-resistant, and extremely tough.
*   **Neutronium-Cast**: Near-indestructible but requires elite engines to fly.

## 6.3 Energy Systems

*   **Energy Cell (The Battery)**: Defines the Capacity (total energy stored).
*   **Reactor (The Engine)**: Defines the Regeneration speed.

## 6.4 Semi-AI (The Brain - OPTIONAL)

*   **Master Status**: Equipping a Semi-AI makes the Shuriken a Swarm Master.
*   **Slave Management**: Masters can be linked to other "Dumb" Shurikens (Slaves).

## 6.5 Sensors (Unlocking Triggers)

*   **Radar**: Long-range monitoring; susceptible to chaff (up to 400 units).
*   **Terahertz**: Penetrates physical obstacles (up to 20 meters).

## 6.6 Blades & Edges

*   **Blunt / Hammer Profile**: High kinetic damage to crush heavy armor/alien mechs.
*   **Energy/Plasma Blade**: Required to melt Zenith energy shields.

## 6.7 Form Designs (Chassis Shape)
Determines the overall physical shape and combat specialization of the Shuriken.

# 7. Enemy Design: The Zenith Collective & Sensor Counters
The Zenith Collective and their assimilated troops demand specific programming:

*   **Zenith EMP-Wardens**: Disable shurikens temporarily.
*   **Phalanx Drones (Shield Bearers)**: Require specific shield-breaker routines.

## 7.1 Enemy AI Behavior & Combat Protocols
Zenith forces utilize advanced tactical protocols:

*   **Ranged Engagement**: Hostiles fire high-velocity energy projectiles at the target. Triggered when a valid sensor lock (Range + LOS + FOV) is established.

# 8. The Workshop (Meta-Progression)
*   **Repair Deck & NPC Mechanic**: Upgrading them increases Nanite speed.
*   **Server Room & NPC Programmer**: Upgrading them unlocks more Gambit slots.

# 9. Setting & Art Direction
*   **Visual Style**: A stark contrast. The underground human resistance base is dirty.    
*   **Readability (Visual Noise Reduction)**: Floating damage numbers are hidden.
    

# 10. Monetization (Fair & Cosmetic)
*   **Drone Skins**: Holographic Zenith-Skins, rusty Punk-Skins.
    

# 11. Future Expansion Plans
*   **Drone Experience Pool (RPG Mechanics)**: Drones feature an internal Nanite Pool (XP).
*   **Player vs Player (PvP)**: Battle other players' drones.

# 12. CombatArena

## 12.1 Overview
The Liberation Strike's Phase 2 is accompanied by a Tactical Map – a 2D combat arena.

## 12.2 Rendering & Perspective
*   3/4 Top-Down View: The arena is rendered from a slightly angled perspective.
*   Free 360° Movement: Drones move freely in continuous 2D space.
    
## 12.3 Arena & Obstacles
*   Walled Arena: An 800x800 unit arena bounded by solid walls.

## 12.4 AI Movement Behaviors
These are the core spatial behaviors mapped to existing GDD actions:

*   **Pursuit (Standard Strike)**: Drone moves toward its visible target. If LOS is blocked, it calculates the best corner of the obstacle to navigate around.
*   **Fighting & Post-Strike Deflection**: High-intensity engagement. Once a strike connects, drones execute a tangential fly-by rather than bouncing backward. The velocity vector is rotated outward (deflected by 45 to 90 degrees) and scaled by a friction multiplier (0.8) to simulate cutting through the target while retaining kinetic momentum. This forces an Orbiting reposition to build up momentum for the next pass.
    *   **Glancing Blows**: If a drone collides with an enemy without reaching strike velocity, it deals a low-damage "Glancing Blow" and deflects outward at reduced speed, preventing "sticky" movement while ensuring continuous damage output.
*   **Steering & Obstacle Avoidance (Wall-Sliding)**: Navigation and Vision are strictly separated.Units project a dynamic set of feelers whose length scales with speed. When a feelerhits an AABB, vector projection allows the drone to slide elegantly parallel to theobstacle rather than bouncing off it.
*   **Retreat & Regroup (Repositioning)**: Drone flies directly away from the target until it reaches a distance of at least 150px or 1.0 seconds have passed. This "Boom-and-Zoom" phase provides a long runway to build up maximum strike velocity before turning back for another pass.
*   **Flee (Emergency Withdrawal)**: Triggered when HP drops below 20%.
*   **Search (LOS Lost)**: When an enemy disappears behind cover, the drone/unit navigates to its last-seen position at full speed. Upon arrival (within 5 units), it performs a 2-second, 360-degree sensor sweep ("dog sniffing"). The `lastSeenPos` memory persists for 3.0 seconds total before the unit resets to its idle patrol routine.
*   **Patrol (Idle Movement)**: When no target is known, unit moves between random waypoints.

## 12.4.1 Minimum Strike Velocity
Drones must reach a minimum speed threshold (MIN_STRIKE_SPEED = 40% of topSpeed)before they can execute a strike.

## 12.5 Sensors & Spatial Detection
*   **Radius Checks**: Euclidean distance checks for Radar (400 units) and Melee range (30 units).
*   **Line of Sight (LOS)**: A parametric raycast from the drone to its target. If blocked during pursuit, drone navigates via obstacle corners.
*   **Lock-on Requirement**: Drones must achieve a sensor lock to begin offensive behaviors.

## 12.6 Visual Feedback & Debugging
Since this is an AI-driven game, the Tactical Map includes comprehensive visual feedback:
*   **Hit Flash VFX**: When a drone strikes the enemy, the target flashes white.
*   **Sensor Range Wireframe**: A faint, dashed ellipse around each drone.
*   **LOS Raycast Line**: A line drawn from each drone to its target.

## 12.7 Architecture, Telemetry & Synchronization
To avoid spaghetti code, the real-time AI and physics rely on a strongly decoupledAngular Entity-Component-System (ECS-lite) Architecture, synchronized via acentralized CombatStore (NgRx SignalStore):
*   **State Management**: CombatStore is the single source of truth for the active battlestate (Entities, Obstacles, DeltaTime).  
*   **The Pipeline**: A CombatEngineService loops every requestAnimationFrame and orchestrates the tick for each entity by passing data through stateless specialized services:
    1.  **SensorService**: Generates vision and proximity data.
    2.  **RoutineService**: Evaluates player Gambit Slots for tactical overrides.  
    3.  **BaseAIService**: Provides the default state machine target vector and handles corner navigation if no Gambits trigger.  
    4.  **SteeringService**: Applies dynamic feelers, wall-sliding, and physical momentum.  
*   **Reactive UI**: The Angular UI components bind directly to the signals in the CombatStore,eliminating event listeners and ensuring telemetry is always 100% accurate.

## 12.8 Ranged Combat & Projectiles
Zenith hostiles utilize ranged attacks to suppress drones.
*   **SHOOTING State**: Triggered when a hostile has a valid sensor lock (Range + LOS + FOV). The entity halts all velocity to stabilize aim.
*   **Projectile Physics**: Projectiles move in a linear path at 300 units/s. They have a small collision radius and are destroyed upon hitting walls, obstacles, or entities.
*   **Damage Resolution**: Projectiles use the standard effectiveness matrix and armor mitigation rules.
*   **Aesthetics**: Projectiles are rendered with distinct visual styles (Energy Beams, Kinetic Streaks, Slashing Tracers, EMP Rings) based on their damage type.