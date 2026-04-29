This document serves as the absolute source of truth for all mathematicalcalculations, stat distributions, and combat mechanics in the game. It isformatted to be easily parsable into TypeScript Interfaces and Data Models.

1\. Global Shuriken Stats
-------------------------

When a Shuriken is fully assembled, its components calculate these final attributes:

### Survival & Defense

*   **maxHp** (Integer): Total health points.    
*   **shields** (Integer): Current energy shield points. Regenerates via Shield Generators.
*   **maxShields** (Integer): Maximum capacity of the energy shield.
*   **armorValue** (Integer): Flat damage reduction against physical attacks.    
*   **evasionRate** (Float 0.0 - 1.0): Percentage chance to completely dodge an attack.    
*   **stealthValue** (Integer): Reduces enemy detection radius. Higher is better.
    

### Mobility

*   **baseWeight** (Integer): Total combined mass of all equipped components. Affects acceleration and kinetic damage.
    *   **Formula:** baseWeight = (hullWeight \* formDesignWeightMult) + engineWeight + energyCellWeight + reactorWeight + sensorWeight + bladeWeight + processorWeight + aiWeight + shieldWeight
*   **topSpeed** (Integer): Maximum pixels/units moved per second.    
*   **acceleration** (Float): How quickly topSpeed is reached. Affected heavily by weight.
    

### Energy & Compute

*   **maxEnergy** (Integer): Maximum energy pool. Provided by the Energy Cell.    
*   **energyRegen** (Integer): Energy recovered per second. Provided by the Reactor.    
*   **energyDrain** (Integer): Passive energy consumed per second while flying/attacking.    
*   **routineCapacity** (Integer): Total IF/THEN routines available.    
*   **reactionTime** (Float): Milliseconds of delay between a Trigger (IF) happening and the Action (THEN) executing. Lower is better.

### Offensive

*   **baseDamage** (Integer): Raw damage number before multipliers.    
*   **damageType** (Enum): KINETIC, SLASHING, ENERGY, EMP.    
*   **critChance** (Float 0.0 - 1.0): Probability to deal critical damage.    
*   **critMultiplier** (Float): Standard is 1.5x (150%).    

2\. Component Modifiers (How parts affect global stats)
-------------------------------------------------------

### A. Anti-Grav Engines

*   **Drifter (Basic):** speed: +230, acceleration: +75, evasionRate: +0.05, energyDrain: 5, stealthValue: 10    
*   **Hauler (Tank):** speed: +180, acceleration: +55, evasionRate: +0.0, energyDrain: 8, weightCapacity: High    
*   **Screamer (Speed):** speed: +500, acceleration: +160, evasionRate: +0.15, energyDrain: 15, stealthValue: -20    
*   **Ghost (Stealth):** speed: +320, acceleration: +133, evasionRate: +0.10, energyDrain: 8, stealthValue: +50    

### B. Hull Materials

*   **Plasteel (Tier I):** hp: 100, armorValue: 5, weight: 20    
*   **Durasteel (Tier II):** hp: 300, armorValue: 25, weight: 60    
*   **Neutronium (Tier III):** hp: 1500, armorValue: 150, weight: 300    

### C. Blades & Edges

*   **Carbon Razor:** damage: 40, type: SLASHING, critChance: 0.10, energyDrain: 0    
*   **Titan Breaker:** damage: 80, type: KINETIC, critChance: 0.05, energyDrain: 0    
*   **Plasma Edge:** damage: 70, type: ENERGY, critChance: 0.15, energyDrain: 25    

### D. Form Designs (Chassis Multipliers)

Forms apply a global multiplier to the final stats.

*   **Disc:** speedMult: 1.0, weightMult: 1.0, damageMult: 1.0
*   **Dagger:** speedMult: 2.0, weightMult: 0.4, critChanceMult: 1.5
*   **Sphere:** speedMult: 0.3, weightMult: 2.5, armorMult: 1.2
*   **Shuriken:** speedMult: 1.0, weightMult: 0.9, damageMult: 1.0
*   **Ion Disk** speedMult: 1.1, weightMult: 1.0, damageMult: 1.6

### E. Processors & AI

*   **Abacus Chip:** slots: 2, reactionTime: 0.5s, processorSpeed: 5    
*   **Cortex CPU:** slots: 3, reactionTime: 0.2s, processorSpeed: 15    
*   **Omni-Node Core:** slots: 5, reactionTime: 0.05s, processorSpeed: 40    

### F. Semi-AI (The Brain - OPTIONAL)

A Shuriken with an equipped Semi-AI is designated as a MASTER. A Shuriken without a Semi-AI is designated as SOLO unless slaved to a Master.

*   **Swarm Coordination:** Masters manage SLAVE units. Slaves receive the Master's iffAccuracy and a 15% Latency reduction.
*   **Processor Synergy:** Equipping a Semi-AI on a Shuriken provides a direct performance boost to the internal Processor, reducing its base reaction time.    
*   **Operational Risk (Grace Period):** If a Master is destroyed, Slaves do NOT suffer an immediate permanent penalty. Instead, they enter a 5-second "Chaos Mode" (erratic movement, basic attacks only) before reverting to their internal base reaction time without the Master's buffs.
    

3\. Deployment Constraints
--------------------------

*   **Mandatory Hardware:** All slots (Engine, Hull, Sensor, Blade, Processor, Energy Cell, Form Design) MUST be filled for deployment.    
*   **Mass Controllability:** All components contribute to the total baseWeight.    
*   **Optional Slot:** semiAI is the only slot that may remain empty. Units without an AI function as autonomous "Dumb-Drones" with base stats.

4\. Combat Mechanics & Math Formulas
------------------------------------

### 4.1 Acceleration & Movement Math

**Logic:** Actual Speed in combat is not instantaneous. Apply weight penalty to acceleration: Heavy things are hard to get moving. Heavier shurikens take longer to reach top speed.

The currentSpeed of a Shuriken is updated every tick based on its acceleration and baseWeight.

*   **Example:** A shuriken with baseWeight of 100 will have its acceleration multiplied by (1 - 0.1) = 0.9. A shuriken with baseWeight of 500 will have its acceleration multiplied by (1 - 0.5) = 0.5.
*   **Formula:** currentSpeed = min(topSpeed, currentSpeed + (acceleration \* (1 - (baseWeight / 1000))))

### 4.2 Kinetic Damage Scaling (Momentum)

Blunt/Kinetic weapons deal more damage the heavier and faster the Shuriken is.

**Logic:** Calculate force: Rewards heavy objects that manage to build up speed.
*   **Example:** A shuriken with currentSpeed of 100 and baseWeight of 100 will have a momentumMultiplier of 2.0. A shuriken with currentSpeed of 200 and baseWeight of 55 will have a momentumMultiplier of 2.1.
*   **Formula:** momentumMultiplier = 1.0 + ((currentSpeed \* baseWeight) / 10000)
*   **Formula:** finalKineticDamage = baseDamage \* momentumMultiplier
*   **Note:** Tangential fly-bys (see Section 8.6) help drones retain their `momentumMultiplier` between strikes by preserving velocity directionality rather than reversing it.

### 4.3 Energy Exhaustion (Emergency Reboot)

To prevent the "Death Spiral" of doing zero damage and moving slowly until death: If currentEnergy drops to 0, the drone initiates an Emergency Reboot.

*   The drone shuts down completely for 3 seconds (topSpeed = 0, evasion = 0).
*   During Reboot, the drone takes +50% incoming damage.
*   After 3 seconds, energy instantly restores to 30% of maximum.
*   Energy systems recharge at 150% efficiency for 3 seconds immediately after reboot.

### 4.4 STUNNED Status Effect

Triggered by specialized AoE attacks (e.g., EMP Pulse) when a drone has no active shields.
*   **Behavior**: The drone enters a state of total paralysis.
*   **Duration**: 1.5 seconds.
*   **Mechanics**:
    *   Velocity is immediately set to 0.
    *   AI routine evaluation (Gambits) is suspended.
    *   Default state machine behavior is disabled.
*   **Recovery**: After the duration, the drone reverts to its `PATROLLING` routine.
    

5\. Damage Types vs. Armor Types (Effectiveness Matrix)
-------------------------------------------------------

When a Shuriken attacks an enemy, the damageType is checked against the enemy's armorType. The resulting damage is multiplied by the effectiveness factor.

| Damage Type | vs UNARMORED (Flesh/Light) | vs HEAVY ARMOR (Mechs) | vs ENERGY SHIELD (DEFERRED) |
|-------------|----------------------------|------------------------|-----------------------------|
| SLASHING (Razor) | 1.5x (150%) | 0.4x (40%) | 0.8x (80%) |
| KINETIC (Blunt) | 1.0x (100%) | 1.5x (150%) | 0.5x (50%) |
| ENERGY (Plasma) | 1.0x (100%) | 1.0x (100%) | 2.0x (200%) |
| EMP (Utility) | 0.0x (Stun only) | 0.0x (Stun only) | Shield Collapse (100%) |

### 5.1 Damage Calculation Formula

*   **Roll for Crit:** if (Math.random() <= critChance) -> isCrit = true
*   **Base Calc:** grossDamage = baseDamage \* (isCrit ? critMultiplier : 1.0)
*   **Matrix Multiplier:** grossDamage = grossDamage \* effectivenessMatrix\[weaponType\]\[enemyArmor\]
*   **Armor Mitigation (Flat):** netDamage = max(1, grossDamage - enemyArmorValue)
*   **Evasion Check:** if (Math.random() <= enemyEvasionRate) -> netDamage = 0

_(Note: Net damage always deals at least 1 point of damage unless completely evaded, to prevent zero-damage infinite loops)._

### 5.3 Glancing Blows (Low-Speed Collisions)

If a **Player-owned Shuriken** collides with an enemy while NOT in the STRIKING state (currentSpeed < MIN_STRIKE_SPEED), it deals a "Glancing Blow". This provides a baseline damage source even when momentum is low. Zenith hostiles do not deal collision damage and rely entirely on ranged projectiles.

*   **Logic:** Baseline contact damage without the benefit of the Kinetic Momentum Multiplier.
*   **Formula:** glancingDamage = max(1, (baseDamage * effectivenessMatrix[weaponType][enemyArmor]) - enemyArmorValue)
*   **Post-Contact:** Attacker immediately enters ORBITING state and deflects tangentially (see Section 8.6) to prepare for a proper strike.

### 5.2 Combat Frequency & Cooldowns

Combat is not purely turn-based but uses a high-frequency simulation (0.1s increments).

*   **Shuriken Attack Speed (Reaction Time Scaling):** A Shuriken's baseReactionTime is affected by its physical inertia (Weight), acceleration (Acceleration), processing power (Processor Speed), and AI integration (Semi-AI).
    *   **Formula:** effectiveReactionTime = baseReactionTime \* (1.0 + (baseWeight / 250) - (acceleration / 1000) - (processorSpeed / 25)) \* semiAiMultiplier
    *   **Minimum Floor:** effectiveReactionTime cannot drop below 0.2x of baseReactionTime.        
    *   **Result:** Heavy, low-acceleration drones attack slowly but hit with more momentum. Light, high-acceleration drones strike with high frequency but less kinetic impact.
        
*   **Hostile Attack Speed (Tiered Cooldowns):** Hostile aggression scales with mission difficulty.    
    *   **Tier I:** 1.5s - 2.5s cooldown.
    *   **Tier II:** 0.8s - 1.5s cooldown.
    *   **Tier III:** 0.4s - 0.8s cooldown.
        
*   **Targeting:** Hostiles randomly target any allied Shuriken that is not currently Stealthed.
    

6\. Mission Difficulty & Scaling
--------------------------------

Mission resistance and rewards scale dynamically based on the average power level of the player's current drone squad and their operational history.

### 6.1 Squad Power Calculation

The tactical potential of a drone is condensed into a squadPower value used to benchmark mission difficulty.

*   **Formula:** squadPower = (routineCapacity \* 25) + (baseDamage \* 15) + (maxHP \* 0.5)
*   **Averaging:** For missions, the average squadPower of all available shurikens is used.

### 6.2 Progression Multipliers (Tiers)

Missions are categorized into Tiers, each applying a multiplier to the base loot and enemy stats. These multipliers scale slowly with the number of successfulRuns.
*   **Tier I (Low):** tierMultiplier = min(0.8, 0.4 + (successfulRuns \* 0.01))
*   **Tier II (Moderate):** tierMultiplier = min(2.0, 1.0 + (successfulRuns \* 0.02))
*   **Tier III (High):** tierMultiplier = min(5.0, 2.5 + (successfulRuns \* 0.05))
    

### 6.3 Enemy Health Scaling

Enemy durability is directly linked to the expected reward tier of the mission.

*   **Base Loot:** baseLoot = squadPower \* tierMultiplier    
*   **Enemy Hull:** hull = floor(baseLoot \* 1.5)    

_(Note: High-tier missions result in significantly more durable Zenith hostiles that require optimized routines and hardware to neutralize within the mission window)._

7\. Movement & Physics Logic (The Base AI)
------------------------------------------

The Drone AI operates on an underlying "Hidden Default" State Machine before evaluating any user-programmed Gambit Slots.

*   **Default Logic Loop:** PATROLLING (Target = null) -> LOS CLEAR -> PURSUING/SHOOTING -> IN MELEE RANGE -> STRIKING -> DEFLECTION/RETREATING -> LOS BLOCKED -> SEARCHING.    
*   **Action Fallbacks:** If an IF condition in the user's Gambit slots is met, but the THEN action cannot be executed (e.g., insufficient energy), the simulation skips the routine and evaluates the next one.    
*   **Default Fallback:** If no gambit conditions are met, the drone reverts to the Hidden Default state machine behavior.    

### 7.1 Triggers (IF Components)

Every trigger must evaluate to a boolean (true / false). Many triggers are locked unless the specific sensor is equipped in the hardware phase. In the Rogue OS UI, these are presented with tactical designations.
*   **ifEnemyInMeleeRange** (Tactical: _Enemy: Close Proximity_)
    *   **reqSensor:** None (Proximity)    
    *   **logic:** Returns true if an enemy is within collision/strike radius.        
*   **ifEnemyInSight** (Tactical: _Enemy: Detected_)
    *   **reqSensor:** Radar / Lidar    
    *   **logic:** Returns true if an enemy is within the global tracking radius.
*   **ifEnemyIsShielded** (Tactical: _Enemy: Shield Active_)
    *   **reqSensor:** EM-Scanner
    *   **logic:** Returns true if the target has active energy shields.
*   **ifEnemyIsOrganic** (Tactical: _Enemy: Soft Target_)
    *   **reqSensor:** Biosensor
    *   **logic:** Returns true if the target armor type is UNARMORED/Flesh.
*   **ifEnemyBehindCover** (Tactical: _Enemy: Obscured_)
    *   **reqSensor:** Terahertz Array    
    *   **logic:** Returns true if target is obscured by a wall/obstacle.
*   **ifTargetIsMarked** (Tactical: _Enemy: Marked_)
    *   **reqSensor:** None (Reads Swarm Data)
    *   **logic:** Returns true if any enemy currently has the 'Marked' status.
*   **ifSelfHpCritical** (Tactical: _Self: Hull Breach_)
    *   **reqSensor:** None (Internal System)
    *   **logic:** Returns true if currentHp < 20% of maxHp.
*   **ifEnergyHigh** (Tactical: _Self: Power Overload_)
    *   **reqSensor:** None (Internal System)
    *   **logic:** Returns true if currentEnergy > 80% of maxEnergy.
*   **ifIncomingProjectile** (Tactical: _Self: Incoming Fire_)
    *   **reqSensor:** Lidar
    *   **logic:** Returns true if an enemy projectile is on a collision course with this Shuriken.

### 7.2 Actions (THEN Components)

Actions dictate the behavior of the Shuriken once a trigger is met. Some actions have specific energy costs or hardware synergies.

*   **actionStandardStrike** (Tactical: _Execute: Standard Strike_)
    *   **behavior:** Moves toward the target and executes a standard attack using the equipped blade profile.
    *   **energyCost:** 0 (Base cost)
*   **actionKineticRam** (Tactical: _Execute: Kinetic Ram_)
    *   **behavior:** Maximizes acceleration toward the target to maximize the momentum multiplier.
    *   **energyCost:** 20
*   **actionEvasiveManeuver** (Tactical: _Execute: Evasive Action_)
    *   **behavior:** Briefly increases evasionRate to Max Cap (0.75) and moves erratically. Cancels current attack.
    *   **energyCost:** 15
*   **actionApplyMark** (Tactical: _Execute: Apply Mark_)
    *   **behavior:** Attacks with the intent to apply the "Marked" status effect instead of dealing max damage.
    *   **energyCost:** 5
*   **actionDefendAlly** (Tactical: _Execute: Defend Ally_)
    *   **behavior:** Repaths to orbit the nearest allied Shuriken (or the player's core) to intercept incoming attacks.
    *   **energyCost:** 0
*   **actionActivateCloak** (Tactical: _Execute: Ghost Protocol_)
    *   **behavior:** Consumes energy per second to push stealthValue to maximum, making the Shuriken very hard to detect by normal enemies.
    *   **energyCost:** 10 per second
*   **actionEmergencyReboot** (Tactical: _Execute: Emergency Reboot_)
    *   **behavior:** Drone stand still for 3 seconds. During this time, the drone is prone to damage and enemy tracking but has 30% of maximum energy after this period.
    *   **energyCost:** 0
*   **actionEmergencyWithdrawal** (Tactical: _Execute: Emergency Withdrawal_)
    *   **behavior:** Moves to the furthest possible edge of the combat zone away from the highest density of enemies to regenerate shields/HP.
    *   **energyCost:** 0
        

8\. 2D Combat Arena: Spatial Mechanics & Math
---------------------------------------------

This section defines the math and logic for the real-time 2D combat arena prototype, which renders the battle from a 3/4 top-down perspective.

### 8.1 Camera & 3/4 Perspective

The arena uses a simulated 3/4 (isometric-lite) perspective. The camera looks down at an angle, so vertical dimensions appear compressed.

*   **Perspective Scale Y:** PERSPECTIVE\_SCALE\_Y = 0.7    
*   **Visual Effect:** All vertical radii (for ellipses) are multiplied by this factor. Circles become ellipses to simulate the angled view. Floor grids remain rectangular.

### 8.2 Depth Sorting (Y-Sort with Z-Axis Elevation)

Entities must be rendered in the correct visual order. Entities "further back" (higher up the screen) draw first. Elevation (Z-axis) also affects draw order: an elevated entity appears to float above ground-level entities.

*   **Sort Key:** sortValue = entity.y - (entity.z \* PERSPECTIVE\_SCALE\_Y)
*   **Logic:** Entities with a lower sortValue are drawn first (they are further back). Entities with a higher sortValue are drawn last (they are in front).
*   **Z-Axis Rendering:**
    *   **Shadow:** Drawn at the entity's ground position (x, y) as a semi-transparent ellipse.
        
    *   **Sprite:** Drawn at (x, y - z \* PERSPECTIVE\_SCALE\_Y) to simulate elevation offset.
        

### 8.3 AI Movement Behaviors

All movement uses smooth acceleration toward a target velocity. The acceleration factor prevents instant direction changes, creating inertia.

**Obstacle Avoidance (Dynamic Feeler Length & Slide):** Vision (finding targets) and Navigation (not hitting walls) are strictly separated. Both drones and enemies utilize a dynamic "feeler" system projected ahead of their current rotation to handle purely physical obstacle avoidance.
*   **Dynamic Length:** feelerLength = 40 + (currentSpeed \* 0.5). (BASE\_FEELER\_LENGTH = 40, SPEED\_LOOKAHEAD\_FACTOR = 0.5).
*   **Wall-Sliding:** Instead of bouncing off walls, the AI uses vector projection to slide parallel to the obstacle surface (see 8.4 Collision Detection for math).

**Pursuit (actionStandardStrike):** Moves in a straight, interpolated line directly toward a visible target entity. (Requires active sensor lock).

**Fighting (Combat Engagement):** Triggered when in meleeRange, at strike velocity, and with clear LOS.

**Patrol (Idle Navigation):**When no target is known or seen, the unit moves at 100% topSpeed between random waypoints within the arena to scan for threats.

**Retreat & Regroup (actionDefendAlly / Post-Strike):** Calculates a vector to guide the fly-by away from the target entity. The drone maintains this retreat until it is at least 150 units away or 1.0 seconds have elapsed. Used to build up maximum momentum before a new strike pass.

**Flee / Retreat (actionEmergencyWithdrawal):** Calculates the vector directly away from the nearest enemy and moves toward the furthest arena boundary.

### 8.4 Collision Detection

**Circle vs. AABB (Entity vs. Obstacle):** Entities are modeled as circles. Obstacles are Axis-Aligned Bounding Boxes (AABB).

*   **Multi-pass Resolution:** Collision checks run for 2 iterations per frame to handle corner cases and multi-object intersections.
*   **Velocity Damping:** Upon impact, the velocity component perpendicular to the surface is dampened: vx/vy \*= -0.2 to prevent clipping and add "bounce".

**Circle vs. Circle (Entity vs. Entity):** Drones and enemies resolve physical overlap to prevent stacking.

*   **Separation:** Entities push each other apart by overlap / 2.
*   **Mutual Impulse:** Contact triggers a small velocity boost away from the point of impact.
*   **Combat Trigger:** If a PLAYER vs ENEMY collision occurs, the engine evaluates if it is a full Strike (STRIKING state) or a Glancing Blow (see Section 5.3).

**Obstacle Avoidance (Dynamic Wall-Sliding Math):** AI entities project 5 feeler rays to steer around cover fluidly without losing momentum.
*   **5-Feeler Layout:** Front (0° at length L), Diag Left/Right (±45° at length L\*0.75), Side Left/Right (±90° at length L\*0.5).
*   **Intersection & Normal:** Raycasts against AABBs find the hitPoint and, crucially, the surface normal of the impacted edge.
*   **Avoidance Force (Repulsion):** avoidanceForce = normal \* penetrationRatio \* MAX\_FORCE.
*   **Sliding Vector (Projection):** If dot(desiredVelocity, normal) < 0 (moving into wall), the velocity is projected along the wall using slideVelocity = desiredVelocity - (normal \* dot).
*   **Blending:** The system blends avoidanceForce with slideVelocity to create a smooth, gliding navigation around corners.


### 8.5 Sensors & Detection

**Radius Checks (AoE):** Simple Euclidean distance check between entities on the 2D ground plane.
*   **Radar Range:** sensorRange (default 400 units). Returns true if dist(drone, target) <= sensorRange.
*   **Melee Range:** meleeRange (default 30 units). Returns true if dist(drone, target) <= meleeRange. (Calculation uses entity.radius + target.radius + 15).

**Initial Detection (No Omniscience):** Drones start a mission with lastSeenPos = null and begin in the PATROLLING state. They have no information about enemy coordinates until they achieve a "Sensor Lock" (Range <= sensorRange AND LOS is clear).

**Line of Sight (ifEnemyBehindCover):** A parametric ray is cast from the drone's position to the target. If the ray segment intersects any obstacle AABB, the target is obscured (returns true). Terahertz Sensors ignore this intersection for detection purposes, allowing a lock through obstacles.

**Enemy Vision (Dynamic FOV Polygon):** Enemies have a 120-degree field of view (FOV).
*   **Angle:** ±1.05 radians (~60 degrees) from current rotation.
*   **Dynamic Clipping:** The FOV is rendered as a visibility polygon. Rays are cast at 0.05 radian increments across the 120-degree arc.    

### 8.6 Strike Velocity Gating & Deflection

Drones must reach a minimum velocity before a strike attempt is valid. This prevents low-energy "humping" where a drone sticks to a target.
*   **Minimum Strike Speed:** MIN_STRIKE_SPEED = 0.4 (40% of topSpeed)
*   **Gate Check:** canStrike = currentSpeed >= (topSpeed \* MIN_STRIKE_SPEED)
*   **Post-Strike Deflection:** Immediately after registering a hit, drones execute a tangential fly-by rather than bouncing backward. The velocity vector is rotated outward from the current **facing direction (rotation)** by 45 to 90 degrees. The speed used for the fly-by is derived from the drone's velocity immediately prior to impact (scaled by a positive friction multiplier, e.g. 0.8), ensuring kinetic momentum is preserved as the drone "slices" through the target. The drone's state shifts to ORBITING (Retreating) until it reaches a distance of 150 units or 1.0s have passed, forcing a repositioning loop for subsequent strikes.
*   **Strike Cooldown:** After a successful hit, strikeCooldown = 1.0 seconds before the next strike.
*   **Glancing Blow Fallback:** If a collision occurs while Strike conditions are not met, the engine defaults to a Glancing Blow (Section 5.3) to ensure continuous pressure.

### 8.7 Strike Damage (Arena)

When a drone's strike connects: Higher speed = more damage, rewarding fast approach vectors.

### 8.8 Search Behavior (SEARCHING State)

When LOS to the enemy is lost, drones transition to SEARCHING to handle the "Corner Problem":
1.  **Last-Seen Memory:** While LOS is clear, drones update lastSeenPos = { enemy.x, enemy.y }.
2.  **Navigate to Last-Seen:** Unit moves to lastSeenPos at full speed.
3.  **360-Degree Scan (Dog Sniffing):** Upon arrival (within 5 units), if the target is still not visible, the unit performs a 360-degree rotation in place for 2 seconds to sweep its sensors.
4.  **Memory Expiry:** After SEARCH\_TOTAL\_TIME = 3 seconds of search activity, lastSeenPos is cleared and the drone falls back to PATROLLING.

### 8.9 Emergency Withdrawal (FLEEING to WITHDRAWN)

Drones prioritize hardware preservation when critical damage is sustained.

1.  **Trigger:** currentHP < maxHP \* 0.2 (below 20%) for human resistance drones only.
2.  **Behavior:** state = FLEEING. Drone moves to the furthest possible arena boundary away from the highest density of enemies.    

### 8.10 Ranged Combat & Projectiles

Zenith hostiles utilize ranged attacks to suppress drones.

1.  **SHOOTING State:** Triggered when a hostile has a valid sensor lock (Range + LOS + FOV).
    *   **Movement:** The entity halts all velocity (targetVelocity = {0,0}). The unit rotates to face and track the target drone continuously.
    *   **Firing Rate:** FIRE\_RATE = 2.0s (default, scales with Tier).
2.  **Projectile Physics:**
    *   **Movement**: Projectiles move in a linear path: `pos = pos + velocity * deltaTime`.
    *   **Speed:** PROJECTILE\_SPEED = 300 units/s.
    *   **Radius**: Projectiles have a physical collision radius (default 3 units).
    *   **Collision Detection**: 
        *   **Obstacles**: Projectiles are destroyed immediately upon entering an AABB boundary.
        *   **Entities**: Collision is resolved via Circle-vs-Point check: `dist(proj, target) <= target.radius + proj.radius`.
    *   **Damage Resolution**: Upon impact, projectiles apply damage using the `EFFECTIVENESS\_MATRIX` and flat `armorValue` reduction: `finalDamage = max(1, round(proj.damage * effectiveness - target.armorValue))`.
    *   **Impact Effects**: Targets sustain a 150ms hit flash and immediate reactive awareness.

### 8.11 Action Logging, ECS & Telemetry (CombatStore)

Battle state is managed via an Angular-based centralized CombatStore (NgRx SignalStore). A dedicated CombatEngineService loops every tick, routing data through specialized services (SensorService, RoutineService, BaseAIService, SteeringService) before patching the CombatStore.

*   **Signals:** enemyEntity (name, type, stats), squadStatuses (HP/Shield/Energy/State), logs.
*   **Tactical Monitor**: Health and Shield bars are **not** rendered in the 3D/2D arena space. All vitals are monitored via the **Squad Monitor** and **Hostile Intel** sidebars to preserve visual clarity during high-intensity combat.
*   **Log Event Examples:**
    *   **State Transitions:** \[STATE\] EntityName: NEW\_STATE
    *   **Firing:** HOSTILE: EntityName fired energy projectile at TargetName

### 8.12 Reactive Awareness (Damage Registry)

Combatants (Drones and Hostiles) possess immediate sensor feedback upon sustaining damage, regardless of their current Line of Sight (LOS) or sensor range.

1.  **Damage Lock-on:** When an entity is struck by a kinetic strike or a projectile, it immediately registers the attacker's current spatial coordinates.
2.  **Memory Update:** The entity's `lastSeenPos` is updated to the attacker's (or projectile's impact) position, and the `searchTimer` is reset to 0.
3.  **Behavior Shift:** Transition immediately from PATROLLING or SEARCHING to PURSUING.

### 8.13 Corner Navigation (Pursuit Optimization)

To prevent drones from getting stuck against convex obstacles when the target is on the other side, the AI calculates a navigation waypoint around the blocking obstacle.

1.  **Blocker Detection:** If `checkLineOfSight` returns false during Pursuit, the AI identifies the `getBlockingObstacle` (AABB).
2.  **Corner Evaluation:** The AI retrieves all 4 corners of the AABB and applies a safety margin:
    *   `safetyMargin = entity.radius + 15`
    *   `safePoint = corner + (normalize(corner - aabbCenter) * safetyMargin)`
3.  **Path Selection:** The AI checks which `safePoints` have a clear LOS from the current position.
4.  **Best Path:** The AI selects the `safePoint` that minimizes the total distance: `dist(entity, safePoint) + dist(safePoint, target)`.
5.  **Execution:** The drone sets its desired velocity toward the selected `safePoint` until LOS to the actual target is restored.

### 8.14 AoE Pulses (EMP Warden)

Specialized units like the EMP Warden utilize non-projectile Area-of-Effect attacks.

1.  **Pulse Sequence**: Triggered every 4.0 seconds when a hostile has a valid target within range.
2.  **Radius**: AoE Pulse covers a 150-unit radius from the source.
3.  **Shield Strip**: Any drone caught in the pulse with `shields > 0` suffers immediate **Shield Collapse** (shields set to 0).
4.  **Stun**: Any drone caught in the pulse with `shields == 0` enters the `STUNNED` state for 1.5 seconds.
5.  **Visuals**: Indicated by an expanding cyan ring and a 300ms hit flash on affected units.
