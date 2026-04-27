This document serves as the absolute source of truth for all mathematical calculations, stat distributions, and combat mechanics in the game. It is formatted to be easily parsable into TypeScript Interfaces and Data Models.

## 1. Global Shuriken Stats

When a Shuriken is fully assembled, its components calculate these final attributes:

### Survival & Defense

* **`maxHp`** (Integer): Total health points.
* **`armorValue`** (Integer): Flat damage reduction against physical attacks.
* **`evasionRate`** (Float 0.0 - 1.0): Percentage chance to completely dodge an attack.
* **`stealthValue`** (Integer): Reduces enemy detection radius. Higher is better.

### Mobility

* **`baseWeight`** (Integer): Total combined mass of all equipped components. Affects acceleration and kinetic damage.
    * **Formula:** `baseWeight = (hullWeight * formDesignWeightMult) + engineWeight + energyCellWeight + reactorWeight + sensorWeight + bladeWeight + processorWeight + aiWeight + shieldWeight`
* **`topSpeed`** (Integer): Maximum pixels/units moved per second.
* **`acceleration`** (Float): How quickly topSpeed is reached. Affected heavily by weight.

### Energy & Compute

* **`maxEnergy`** (Integer): Maximum energy pool. Provided by the **Energy Cell**.
* **`energyRegen`** (Integer): Energy recovered per second. Provided by the **Reactor**.
* **`energyDrain`** (Integer): Passive energy consumed per second while flying/attacking.
* **`routineCapacity`** (Integer): Total IF/THEN routines available.
* **`reactionTime`** (Float): Formerly "latency". Milliseconds of delay between a Trigger (IF) happening and the Action (THEN) executing. Lower is better.

### Offensive

* **`baseDamage`** (Integer): Raw damage number before multipliers.
* **`damageType`** (Enum): KINETIC, SLASHING, ENERGY, EMP.
* **`critChance`** (Float 0.0 - 1.0): Probability to deal critical damage.
* **`critMultiplier`** (Float): Standard is 1.5x (150%).

## 2. Component Modifiers (How parts affect global stats)

### A. Anti-Grav Engines

* **Drifter (Basic):** speed: +50, acceleration: +10, evasionRate: +0.05, energyDrain: 5, stealthValue: 10
* **Hauler (Tank):** speed: +30, acceleration: +5, evasionRate: +0.0, energyDrain: 8, weightCapacity: High
* **Screamer (Speed):** speed: +120, acceleration: +30, evasionRate: +0.15, energyDrain: 15, stealthValue: -20
* **Ghost (Stealth):** speed: +60, acceleration: +15, evasionRate: +0.10, energyDrain: 8, stealthValue: +50

### B. Hull Materials

* **Plasteel (Tier I):** hp: 100, armorValue: 5, weight: 20
* **Durasteel (Tier II):** hp: 300, armorValue: 25, weight: 60
* **Neutronium (Tier III):** hp: 1500, armorValue: 150, weight: 300

### C. Blades & Edges

* **Carbon Razor:** damage: 20, type: SLASHING, critChance: 0.10, energyDrain: 0
* **Titan Breaker:** damage: 40, type: KINETIC, critChance: 0.05, energyDrain: 0
* **Plasma Edge:** damage: 35, type: ENERGY, critChance: 0.15, energyDrain: 25

### D. Form Designs (Chassis Multipliers)

Forms apply a global multiplier to the final stats.

* **Striker Disc:** speedMult: 1.0, weightMult: 1.0, damageMult: 1.0
* **Viper Dagger:** speedMult: 1.2, weightMult: 0.8, critChanceMult: 1.5
* **Juggernaut Sphere:** speedMult: 0.7, weightMult: 1.5, armorMult: 1.2

### E. Processors & AI

* **Abacus Chip:** slots: 2, reactionTime: 0.5s, processorSpeed: 5
* **Cortex CPU:** slots: 3, reactionTime: 0.2s, processorSpeed: 15
* **Omni-Node Core:** slots: 5, reactionTime: 0.05s, processorSpeed: 40

### F. Semi-AI (The Brain - OPTIONAL)
A Shuriken with an equipped Semi-AI is designated as a **MASTER**. A Shuriken without a Semi-AI is designated as **SOLO** unless slaved to a Master.
*   **Swarm Coordination:** Masters manage **SLAVE** units. Slaves receive the Master's `iffAccuracy` and a 15% Latency reduction.
*   **Operational Risk (Grace Period):** If a Master is destroyed, Slaves do NOT suffer an immediate permanent penalty. Instead, they enter a 5-second "Chaos Mode" (erratic movement, basic attacks only) before reverting to their internal base reaction time without the Master's buffs.

## 3. Deployment Constraints
*   **Mandatory Hardware:** All slots (Engine, Hull, Sensor, Blade, Processor, Energy Cell, Form Design) MUST be filled for deployment.
*   **Mass Controllability:** All components contribute to the total `baseWeight`.
*   **Optional Slot:** `semiAI` is the only slot that may remain empty. Units without an AI function as autonomous "Dumb-Drones" with base stats.

## 4. Combat Mechanics & Math Formulas

### 3.1 Acceleration & Movement Math

Actual Speed in combat is not instantaneous.
currentSpeed = min(topSpeed, currentSpeed + (acceleration * (1 - (baseWeight / 1000))))
Logic: Heavier shurikens take longer to reach top speed.

### 3.2 Kinetic Damage Scaling (Momentum)

Blunt/Kinetic weapons deal more damage the heavier and faster the Shuriken is.
momentumMultiplier = 1.0 + ((currentSpeed / 100) * (baseWeight / 100))
finalKineticDamage = baseDamage * momentumMultiplier

### 3.3 Energy Exhaustion (Emergency Reboot)
To prevent the "Death Spiral" of doing zero damage and moving slowly until death: If currentEnergy drops to 0, the drone initiates an Emergency Reboot.

* The drone shuts down completely for 3 seconds (Top Speed = 0, Evasion = 0).
* During Reboot, the drone takes +50% incoming damage.
* After 3 seconds, energy instantly restores to 30% of maximum.
* Energy systems recharge at 150% efficiency for 3 seconds immediately after reboot.

## 4. Damage Types vs. Armor Types (Effectiveness Matrix)
When a Shuriken attacks an enemy, the damageType is checked against the enemy's armorType. The resulting damage is multiplied by the effectiveness factor.

| Damage Type | vs UNARMORED (Flesh/Light) | vs HEAVY ARMOR (Mechs) | vs ENERGY SHIELD (DEFERRED) |
|-------------|----------------------------|------------------------|-----------------------------|
| SLASHING (Razor) | 1.5x (150%) | 0.2x (20%) | 0.8x (80%) |
| KINETIC (Blunt) | 1.0x (100%) | 1.5x (150%) | 0.5x (50%) |
| ENERGY (Plasma) | 1.0x (100%) | 1.0x (100%) | 2.0x (200%) |
| EMP (Utility) | 0.0x (Stun only) | 0.0x (Stun only) | Instantly Breaks Shield |

### 4.1 Damage Calculation Formula

**Roll for Crit:** if (Math.random() <= critChance) -> isCrit = true
**Base Calc:** grossDamage = baseDamage * (isCrit ? critMultiplier : 1.0)
**Matrix Multiplier:** grossDamage = grossDamage * effectivenessMatrix[weaponType][enemyArmor]
**Armor Mitigation (Flat):** netDamage = max(1, grossDamage - enemyArmorValue)
**Evasion Check:** if (Math.random() <= enemyEvasionRate) -> netDamage = 0

(Note: Net damage always deals at least 1 point of damage unless completely evaded, to prevent zero-damage infinite loops).

### 4.2 Combat Frequency & Cooldowns 
 Combat is not purely turn-based but uses a high-frequency simulation (0.1s increments).
 
* **Shuriken Attack Speed (Reaction Time Scaling):** A Shuriken's `baseReactionTime` is affected by its physical inertia (Weight), acceleration (Acceleration) and its processing power (Processor Speed).
    * **Formula:** `effectiveReactionTime = baseReactionTime * (1.0 + (baseWeight / 250) - (acceleration / 25) - (processorSpeed / 25))`
    * **Minimum Floor:** `effectiveReactionTime` cannot drop below `0.2x` of `baseReactionTime`.
    * **Result:** Heavy, low-acceleration drones attack slowly but hit with more momentum. Light, high-acceleration drones strike with high frequency but less kinetic impact.

* **Hostile Attack Speed (Tiered Cooldowns):** Hostile aggression scales with mission difficulty.
    * **Tier I:** 1.5s - 2.5s cooldown.
    * **Tier II:** 0.8s - 1.5s cooldown.
    * **Tier III:** 0.4s - 0.8s cooldown.
 * **Targeting:** Hostiles randomly target any allied Shuriken that is not currently **Stealthed**.

### 5.0 Priority & Fallback Logic
The AI checks Slots from 1 to N. 
* **Action Fallbacks:** If an IF condition is met, but the THEN action cannot be executed (e.g., insufficient energy), the simulation skips the current routine and evaluates the next one in the list.
* **Default Slot:** Every Shuriken has a hidden, uneditable final slot: `IF Enemy Detected -> THEN Standard Strike`. This ensures drones never idle if they have energy and a target, but they must first locate the target via sensors.

### 5.1 Triggers (IF Components)
Every trigger must evaluate to a boolean (true / false). Many triggers are locked unless the specific sensor is equipped in the hardware phase. In the Rogue OS UI, these are presented with tactical designations.

* **`ifEnemyInMeleeRange`** (Tactical: **Enemy: Close Proximity**)
    * **reqSensor:** None (Proximity)
    * **logic:** Returns true if an enemy is within collision/strike radius.

* **`ifEnemyInSight`** (Tactical: **Enemy: Detected**)
    * **reqSensor:** Radar / Lidar
    * **logic:** Returns true if an enemy is within the global tracking radius.

* **`ifEnemyIsShielded`** (Tactical: **Enemy: Shield Active**)
    * **reqSensor:** EM-Scanner (DEFERRED)
    * **logic:** Currently returns false.

* **`ifEnemyIsOrganic`** (Tactical: **Enemy: Soft Target**)
    * **reqSensor:** Biosensor
    * **logic:** Returns true if the target armor type is UNARMORED/Flesh.

* **`ifEnemyBehindCover`** (Tactical: **Enemy: Obscured**)
    * **reqSensor:** Terahertz Array
    * **logic:** Returns true if target is obscured by a wall/obstacle.

* **`ifTargetIsMarked`** (Tactical: **Enemy: Marked**)
    * **reqSensor:** None (Reads Swarm Data)
    * **logic:** Returns true if any enemy currently has the 'Marked' status.

* **`ifSelfHpCritical`** (Tactical: **Self: Hull Breach**)
    * **reqSensor:** None (Internal System)
    * **logic:** Returns true if currentHp < 20% of maxHp.

* **`ifEnergyHigh`** (Tactical: **Self: Power Overload**)
    * **reqSensor:** None (Internal System)
    * **logic:** Returns true if currentEnergy > 80% of maxEnergy.

* **`ifIncomingProjectile`** (Tactical: **Self: Incoming Fire**)
    * **reqSensor:** Lidar
    * **logic:** Returns true if an enemy projectile is on a collision course with this Shuriken.

### 5.2 Actions (THEN Components)

Actions dictate the behavior of the Shuriken once a trigger is met. Some actions have specific energy costs or hardware synergies.

* **`actionStandardStrike`** (Tactical: **Execute: Standard Strike**)
    * **behavior:** Moves toward the target and executes a standard attack using the equipped blade profile.
    * **energyCost:** 0 (Base cost)

* **`actionKineticRam`** (Tactical: **Execute: Kinetic Ram**)
    * **behavior:** Maximizes acceleration toward the target to maximize the momentum multiplier.
    * **energyCost:** 20

* **`actionEvasiveManeuver`** (Tactical: **Execute: Evasive Action**)
    * **behavior:** Briefly increases evasionRate to Max Cap (0.75) and moves erratically. Cancels current attack.
    * **energyCost:** 15

* **`actionApplyMark`** (Tactical: **Execute: Apply Mark**)
    * **behavior:** Attacks with the intent to apply the "Marked" status effect instead of dealing max damage.
    * **energyCost:** 5

* **`actionDefendAlly`** (Tactical: **Execute: Defend Ally**)
    * **behavior:** Repaths to orbit the nearest allied Shuriken (or the player's core) to intercept incoming attacks.
    * **energyCost:** 0

* **`actionActivateCloak`** (Tactical: **Execute: Ghost Protocol**)
    * **behavior:** Consumes energy per second to push stealthValue to maximum, making the Shuriken very hard to detect by normal enemies.
    * **energyCost:** 10 per second

* **`actionEmergencyReboot`** (Tactical: **Execute: Emergency Reboot**)
    * **behavior:** Drone stand still for 3 seconds. During this time, the drone is **prone** to damage and enemy tracking but has 30% of maximum energy after this period.
    * **energyCost:** 0

* **`actionEmergencyWithdrawal`** (Tactical: **Execute: Emergency Withdrawal**)
    * **behavior:** Moves to the furthest possible edge of the combat zone away from the highest density of enemies to regenerate shields/HP.
    * **energyCost:** 0

## 6. 2D Combat Arena: Spatial Mechanics & Math

This section defines the math and logic for the real-time 2D combat arena prototype, which renders the battle from a 3/4 top-down perspective.

### 6.1 Camera & 3/4 Perspective

The arena uses a simulated 3/4 (isometric-lite) perspective. The camera looks down at an angle, so vertical dimensions appear compressed.

* **Perspective Scale Y:** `PERSPECTIVE_SCALE_Y = 0.7`
* **Visual Effect:** All vertical radii (for ellipses) are multiplied by this factor. Circles become ellipses to simulate the angled view. Floor grids remain rectangular.

### 6.2 Depth Sorting (Y-Sort with Z-Axis Elevation)

Entities must be rendered in the correct visual order. Entities "further back" (higher up the screen) draw first. Elevation (Z-axis) also affects draw order: an elevated entity appears to float above ground-level entities.

* **Sort Key:** `sortValue = entity.y - (entity.z * PERSPECTIVE_SCALE_Y)`
* **Logic:** Entities with a **lower** `sortValue` are drawn **first** (they are further back). Entities with a higher `sortValue` are drawn last (they are in front).
* **Z-Axis Rendering:**
    * **Shadow:** Drawn at the entity's ground position `(x, y)` as a semi-transparent ellipse.
    * **Sprite:** Drawn at `(x, y - z * PERSPECTIVE_SCALE_Y)` to simulate elevation offset.

### 6.3 AI Movement Behaviors
All movement uses smooth acceleration toward a target velocity. The acceleration factor prevents instant direction changes, creating inertia.

* **Acceleration Smoothing:**
    ```
    accelFactor = acceleration * deltaTime
    vx += (targetVx - vx) * min(1, accelFactor * 0.1)
    vy += (targetVy - vy) * min(1, accelFactor * 0.1)
    ```

#### Obstacle Avoidance (Feeler System)
Both drones and enemies utilize a "feeler" point projected 50 units ahead of their current `rotation`. If this point intersects an obstacle AABB, a steering force is applied away from the `obstacle.center`.
* **Blending:** `targetVelocity = (desiredVector * 0.4) + (steeringVector * 0.6)`
* **Result:** Units steer proactively around cover rather than colliding and stopping.

#### Pursuit (actionStandardStrike)
Moves in a straight, interpolated line directly toward a visible target entity. (Requires active sensor lock).
```
direction = normalize(target.position - drone.position)
targetVelocity = direction * topSpeed
```

#### Fighting (Combat Engagement)
Triggered when in `meleeRange`, at strike velocity, and with clear LOS.
```
// Prioritize direct, aggressive pursuit for maximum impact
direction = normalize(target.position - drone.position)
targetVelocity = direction * topSpeed
```

#### Patrol (Idle Navigation)
When no target is known or seen, the unit moves at 80% top speed between random waypoints within the arena to scan for threats.
```
targetVelocity = normalize(waypoint - entity.position) * (topSpeed * 0.8)
```

#### Orbit (actionDefendAlly)
Calculates a circular path around a target entity at a set radius.
```
orbitRadius = 80 units
orbitAngle += (topSpeed / orbitRadius) * deltaTime
goalX = target.x + cos(orbitAngle) * orbitRadius
goalY = target.y + sin(orbitAngle) * orbitRadius
direction = normalize(goal - drone.position)
targetVelocity = direction * topSpeed
```

#### Flee / Retreat (actionEmergencyWithdrawal)
Calculates the vector directly away from the nearest enemy and moves toward the furthest arena boundary.
```
awayDirection = normalize(drone.position - enemy.position)
targetVelocity = awayDirection * topSpeed
```

### 6.4 Collision Detection

#### Circle vs. AABB (Entity vs. Obstacle)
Entities are modeled as circles. Obstacles are Axis-Aligned Bounding Boxes (AABB).

* **Multi-pass Resolution:** Collision checks run for 2 iterations per frame to handle corner cases and multi-object intersections.
* **Velocity Damping:** Upon impact, the velocity component perpendicular to the surface is dampened: `vx/vy *= -0.2` to prevent clipping and add "bounce".
* **Resolution Math:**
  ```
  closestPoint.x = clamp(circle.x, box.x, box.x + box.w)
  closestPoint.y = clamp(circle.y, box.y, box.y + box.h)
  distSq = (circle.x - closestPoint.x)^2 + (circle.y - closestPoint.y)^2
  
  if (distSq < radius^2):
      if (distSq > 1e-6): // Standard edge/corner collision
          distance = sqrt(distSq)
          overlap = radius - distance
          pushDir = (circle.pos - closestPoint) / distance
          circle.pos += pushDir * overlap
      else: // Center is inside box - push to nearest edge
          dl = cx - box.x; dr = (box.x + box.w) - cx; dt = cy - box.y; db = (box.y + box.h) - cy
          minDist = min(dl, dr, dt, db)
          // Resulting position is offset by 'radius' from the closest edge boundary
  ```

#### Circle vs. Circle (Entity vs. Entity)
Drones and enemies resolve physical overlap to prevent stacking.
* **Separation:** Entities push each other apart by `overlap / 2`.
* **Mutual Impulse:** contact triggers a small velocity boost away from the point of impact.

#### Obstacle Avoidance (Feeler System)
AI entities project path safety to steer around cover.
* **Logic:** Projects a "feeler" point `50 units` ahead of current `rotation`.
* **Avoidance:** If the feeler hits an AABB, a steering force is applied away from the `obstacle.center`.
* **Blending:** `targetVelocity = (pursuitVector * 0.3) + (avoidanceVector * 0.7)`.

### 6.5 Sensors & Detection

#### Radius Checks (AoE)
Simple Euclidean distance check between entities on the 2D ground plane.
* **Radar Range:** `sensorRange` (default 120 units). Returns `true` if `dist(drone, target) <= sensorRange`.
* **Melee Range:** `meleeRange` (default 20 units). Returns `true` if `dist(drone, target) <= meleeRange`.

#### Initial Detection (No Omniscience)
Drones start a mission with `lastSeenPos = null` and begin in the **PATROLLING** state. They have no information about enemy coordinates until they achieve a "Sensor Lock" (Range <= sensorRange AND LOS is clear).

#### Line of Sight (ifEnemyBehindCover)
A parametric ray is cast from the drone's position to the target. If the ray segment intersects any obstacle AABB, the target is **obscured** (returns `true`). **Terahertz Sensors** ignore this intersection for detection purposes, allowing a lock through obstacles.

**Slab Method (Parametric Line-AABB Intersection):**
```
For each axis (X, Y):
    t1 = (box.min[axis] - ray.origin[axis]) / ray.direction[axis]
    t2 = (box.max[axis] - ray.origin[axis]) / ray.direction[axis]
    if t1 > t2: swap(t1, t2)
    tmin = max(tmin, t1)
    tmax = min(tmax, t2)
    if tmin > tmax: no intersection

if tmin <= tmax AND tmin >= 0 AND tmax <= 1: ray is blocked
```
The `t` range `[0, 1]` represents the line segment from origin to target.

#### Enemy Vision (Dynamic FOV Polygon)
Enemies have a 120-degree field of view (FOV).
* **Angle:** ±1.05 radians (~60 degrees) from current `rotation`.
* **Dynamic Clipping:** The FOV is rendered as a visibility polygon. Rays are cast at 0.05 radian increments across the 120-degree arc. Each ray's `tmin` against all obstacles determines the final vertex for the clipped polygon.
* **Logic Match:** If a drone is within the 120-degree cone AND its distance to the enemy is `<=` ray-cast `dist(enemy, tx, ty) * tmin`, it is considered "Visible".

### 6.6 Strike Velocity Gating

Drones must reach a minimum velocity before a strike attempt is valid. This prevents low-energy circling and encourages fly-by attack patterns.

* **Minimum Strike Speed:** `MIN_STRIKE_SPEED = 0.4` (40% of `topSpeed`)
* **Gate Check:** `canStrike = currentSpeed >= (topSpeed * MIN_STRIKE_SPEED)`
* **Strike Cooldown:** After a successful hit, `strikeCooldown = 1.5 seconds` before the next strike.
* **Post-Strike Bounce:** After hitting, the drone's velocity is redirected away from the target at 70% of topSpeed, creating natural fly-by patterns.

### 6.7 Strike Damage (Arena)

When a drone's strike connects:
```
damage = floor(10 + currentSpeed * 0.15)
```
Higher speed = more damage, rewarding fast approach vectors.

### 6.8 Search Behavior (SEARCHING State)

When LOS to the enemy is lost, drones transition to SEARCHING:

1. **Last-Seen Memory:** While LOS is clear, drones continuously update `lastSeenPos = { enemy.x, enemy.y }`.
2. **Navigate to Last-Seen:** Drone moves to `lastSeenPos` at full speed.
3. **Expanding Spiral:** Upon arrival (within 30 units), the drone orbits with an expanding radius:
```
searchRadius = 60 + searchTimer * 15  (capped at 200)
orbitAngle += (topSpeed / searchRadius) * deltaTime
goalX = lastSeen.x + cos(orbitAngle) * searchRadius
goalY = lastSeen.y + sin(orbitAngle) * searchRadius
```
4. **Memory Expiry:** After `SEARCH_LINGER_TIME = 3 seconds`, `lastSeenPos` is cleared and the drone falls back to direct PURSUING or PATROLLING.

### 6.9 Emergency Withdrawal (FLEEING to WITHDRAWN)

Drones prioritize hardware preservation when critical damage is sustained.

1. **Trigger:** `currentHP < maxHP * 0.2` (below 20%) for human resistance drones only. Zenith hostiles never flee.
2. **Behavior:** `state = FLEEING`. Drone moves to the nearest arena boundary.
3. **Disengagement Timer:** If `drone.position` is within 2 units of any `WALL_THICKNESS` boundary:
   ```
   withdrawalTimer += deltaTime
   if (withdrawalTimer >= 2.0 seconds):
       state = WITHDRAWN
   ```
### 6.10 Ranged Combat & Projectiles

Zenith hostiles utilize ranged attacks to suppress drones.

1.  **SHOOTING State**: Triggered when a hostile has a valid sensor lock (Range + LOS + FOV).
    *   **Movement**: The entity halts all velocity (`targetVelocity = {0,0}`).
    *   **Firing Rate**: `FIRE_RATE = 2.0s`.
2.  **Projectile Physics**:
    *   **Speed**: `PROJECTILE_SPEED = 300 units/s`.
    *   **Collision**: Projectiles are destroyed upon hitting walls, obstacles, or entities.
    *   **Damage**: Flat damage value (default: 15).
3.  **Dodge Mechanics**: Drones do not automatically dodge projectiles via AI; they must rely on their `evasionRate` (simulated) or physical movement/speed to stay out of the projectile's path.

### 6.11 Action Logging (Live Feed)

The Tactical Map emits standardized log strings for every significant action to synchronize with the **Live Feed**:
*   **State Transitions**: `[STATE] EntityName: NEW_STATE`
*   **Firing**: `EntityName fired energy projectile at TargetName`
*   **Strikes**: `AttackerName executed kinetic strike for DMG DMG!`
*   **Hits**: `Projectile hit TargetName for DMG DMG!`
*   **Withdrawal**: `EntityName successfully withdrew from combat.`
*   **Destruction**: `[CRITICAL] EntityName destroyed.`

### 6.12 Reactive Awareness (Damage Registry)

Combatants (Drones and Hostiles) possess immediate sensor feedback upon sustaining damage, regardless of their current Line of Sight (LOS) or sensor range.

1.  **Damage Lock-on**: When an entity is struck by a kinetic strike or a projectile, it immediately registers the attacker's current spatial coordinates.
2.  **Memory Update**: The entity's `lastSeenPos` is updated to the attacker's position, and the `searchTimer` is reset to 0.
3.  **Behavior Shift**: This allows the entity to immediately transition from **PATROLLING** or **SEARCHING** back to **PURSUING** or **SHOOTING**, effectively eliminating "blind-side" exploits where an entity could be destroyed without reacting.
