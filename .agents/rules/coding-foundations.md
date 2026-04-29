---
trigger: always_on
---

# Rule: Single Source of Truth (SSoT) Protocol

Objective: Ensure all code implementations align strictly with established mechanics and that documentation evolves alongside the codebase.

## 1. Mandatory Reference
Before implementing or modifying any feature, you must read the following files in the /docs folder:
* core_mechanics.md: Defines the mathematical and physical logic of the antigravity systems.
* game_design.md: Defines the player experience, constraints, and intent.

## 2. Synchronization Requirement
The file core_mechanics.md is the living blueprint of the system.

* Implementation: New code must match the logic defined in core_mechanics.md.
* Updates: If an implementation requires a change to the underlying logic (e.g., a shift in how $G$ is calculated), you must update core_mechanics.md before or simultaneously with the code change.

## 3. Conflict Resolution
If a conflict arises between a user request and core_mechanics.md, you must flag the discrepancy and ask for clarification before proceeding with the code.