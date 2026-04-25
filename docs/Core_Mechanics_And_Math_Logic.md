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
* **`latency`** (Float): Milliseconds of delay between a Trigger (IF) happening and the Action (THEN) executing. Lower is better.

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

* **Abacus Chip:** slots: 2, latency: 0.5s
* **Cortex CPU:** slots: 3, latency: 0.2s
* **Omni-Node Core:** slots: 5, latency: 0.05s

### F. Semi-AI (The Brain - OPTIONAL)
A Shuriken with an equipped Semi-AI is designated as a **MASTER**. A Shuriken without a Semi-AI is designated as **SOLO** unless slaved to a Master.
*   **Swarm Coordination:** Masters manage **SLAVE** units. Slaves receive the Master's `iffAccuracy` and a 15% Latency reduction.
*   **Operational Risk:** If a Master is destroyed, all its Slaves suffer a 50% Latency penalty for the remainder of the strike.

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

### 3.3 Energy Exhaustion

If currentEnergy drops to 0:

* **Top Speed** is reduced by 50%.
* **Evasion** drops to 0.
* **Energy-based weapons (Plasma)** deal 0 damage.

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

## 5. The Gambit System (Logic Routines)

The AI is programmed using a Priority Slot System. The simulation checks Slots from 1 to N. The first valid IF condition triggers its corresponding THEN action.

### 5.1 Triggers (IF Components)

Every trigger must evaluate to a boolean (true / false). Many triggers are locked unless the specific sensor is equipped in the hardware phase.

* **`ifEnemyInMeleeRange`**
    * **reqSensor:** None (Proximity)
    * **logic:** Returns true if an enemy is within collision/strike radius.

* **`ifEnemyInSight`**
    * **reqSensor:** Radar / Lidar
    * **logic:** Returns true if an enemy is within the global tracking radius.

* **`ifEnemyIsShielded`**
    * **reqSensor:** EM-Scanner
    * **logic:** Returns true if the target has an active Energy Shield.

* **`ifEnemyIsOrganic`**
    * **reqSensor:** Biosensor
    * **logic:** Returns true if the target armor type is UNARMORED/Flesh.

* **`ifEnemyBehindCover`**
    * **reqSensor:** Terahertz Array
    * **logic:** Returns true if target is obscured by a wall/obstacle.

* **`ifTargetIsMarked`**
    * **reqSensor:** None (Reads Swarm Data)
    * **logic:** Returns true if any enemy currently has the 'Marked' status.

* **`ifSelfHpCritical`**
    * **reqSensor:** None (Internal System)
    * **logic:** Returns true if currentHp < 20% of maxHp.

* **`ifEnergyHigh`**
    * **reqSensor:** None (Internal System)
    * **logic:** Returns true if currentEnergy > 80% of maxEnergy.

* **`ifIncomingProjectile`**
    * **reqSensor:** Lidar
    * **logic:** Returns true if an enemy projectile is on a collision course with this Shuriken.

### 5.2 Actions (THEN Components)

Actions dictate the behavior of the Shuriken once a trigger is met. Some actions have specific energy costs or hardware synergies.

* **`actionStandardStrike`**
    * **behavior:** Moves toward the target and executes a standard attack using the equipped blade profile.
    * **energyCost:** 0 (Base cost)

* **`actionKineticRam`**
    * **behavior:** Maximizes acceleration in a straight line toward the target to maximize the momentum multiplier.
    * **energyCost:** 15

* **`actionEvasiveManeuver`**
    * **behavior:** Briefly increases evasionRate to 1.0 (100%) and moves erratically. Cancels current attack.
    * **energyCost:** 20

* **`actionApplyMark`**
    * **behavior:** Attacks with the intent to apply the "Marked" status effect instead of dealing max damage.
    * **energyCost:** 5

* **`actionDefendAlly`**
    * **behavior:** Repaths to orbit the nearest allied Shuriken (or the player's core) to intercept incoming attacks.
    * **energyCost:** 0

* **`actionActivateCloak`**
    * **behavior:** Consumes energy per second to push stealthValue to maximum, making the Shuriken untargetable by normal enemies.
    * **energyCost:** 10 per second

* **`actionRetreat`**
    * **behavior:** Moves to the furthest possible edge of the combat zone away from the highest density of enemies to regenerate shields/HP.
    * **energyCost:** 0