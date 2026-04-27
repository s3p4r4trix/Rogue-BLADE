This document serves as the absolute source of truth for all mathematical calculations, stat distributions, and combat mechanics in the game. It is formatted to be easily parsable into TypeScript Interfaces and Data Models.

## 1. Global Shuriken Stats

When a Shuriken is fully assembled, its components calculate these final attributes:

### Survival & Defense

* **`maxHp`** (Integer): Total health points.
* **`armorValue`** (Integer): Flat damage reduction against physical attacks.
* **`evasionRate`** (Float 0.0 - 1.0): Percentage chance to completely dodge an attack.
* **`stealthValue`** (Integer): Reduces enemy detection radius. Higher is better.

### Mobility

* **`baseWeight`** (Integer): Affects acceleration and kinetic damage.
* **`topSpeed`** (Integer): Maximum pixels/units moved per second.
* **`acceleration`** (Float): How quickly topSpeed is reached. Affected heavily by weight.

### Energy & Compute

* **`maxEnergy`** (Integer): Maximum energy pool.
* **`energyRegen`** (Integer): Energy recovered per second.
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

| Damage Type | vs UNARMORED (Flesh/Light) | vs HEAVY ARMOR (Mechs) | vs ENERGY SHIELD (Zenith) |
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
* **Default Slot:** Every Shuriken has a hidden, uneditable final slot: `IF Enemy Exists -> THEN Standard Strike`. This ensures drones never idle if they have energy and a target.

### 5.1 Triggers (IF Components)
Every trigger must evaluate to a boolean (true / false). Many triggers are locked unless the specific sensor is equipped in the hardware phase. In the Rogue OS UI, these are presented with tactical designations.

* **`ifEnemyInMeleeRange`** (Tactical: **Enemy: Close Proximity**)
    * **reqSensor:** None (Proximity)
    * **logic:** Returns true if an enemy is within collision/strike radius.

* **`ifEnemyInSight`** (Tactical: **Enemy: Detected**)
    * **reqSensor:** Radar / Lidar
    * **logic:** Returns true if an enemy is within the global tracking radius.

* **`ifEnemyIsShielded`** (Tactical: **Enemy: Shield Active**)
    * **reqSensor:** EM-Scanner
    * **logic:** Returns true if the target has an active Energy Shield.

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
