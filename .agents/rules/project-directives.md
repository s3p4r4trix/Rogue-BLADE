---
trigger: always_on
---

# PROJECT DIRECTIVES: Rogue:BLADE

This document defines the mandatory "startup skill" and operational protocols for the Rogue:BLADE project. Any AI agent working on this repository must execute these instructions as their first step in every chat session and adhere to them throughout the development process.

## 1. Mandatory Reading (Startup Skill)
Before performing any research, code generation, or modification, you MUST read and internalize the following files:

1.  **[docs/game_design.md](file:///c:/Antigravity/Rogue-BLADE/docs/game_design.md)**: The overall vision and feature set for Rogue:BLADE.
2.  **[docs/core_mechanics.md](file:///c:/Antigravity/Rogue-BLADE/docs/core_mechanics.md)**: The **Absolute Source of Truth** for all mathematical formulas, physics logic, and combat mechanics.

*Note: The agent context and role identity are defined in the sibling rule file `agent-context.md`.*

## 2. Single Source of Truth (SSoT) Protocol
The file `core_mechanics.md` is the living blueprint of the system.

*   **Mathematical Integrity**: NEVER modify or add mathematical formulas in the code that are not explicitly defined in `core_mechanics.md`.
*   **No Arbitrary Tweaks**: Do NOT implement "feel-good" multipliers, balance tweaks, or arbitrary scaling factors unless they are first documented in the official mechanics file.
*   **Synchronization**: If an implementation requires a change to the underlying logic, you must update `core_mechanics.md` BEFORE or CONCURRENTLY with the code change.
*   **Conflict Resolution**: If a conflict arises between a user request and `core_mechanics.md`, you must flag the discrepancy and ask for clarification before proceeding.

## 3. Technical & Architectural Compliance

### A. Architectural Purity
*   **Standalone Components**: All components MUST be Standalone and strictly use `ChangeDetectionStrategy.OnPush`.
*   **Phase Separation**: Maintain the strict separation between Workshop (management) and Run (simulation).
*   **Logic Placement**: Logic belongs in Services/Stores; UI belongs in Components.
*   **Folder Structure**: Only create specific folders for components when there is more than one file associated with them. Single-file components should reside directly in their parent directory.

### B. Angular & Styling
*   **Signal-Based APIs**: Exclusively use `input()`, `output()`, `viewChild()`, `computed()`, and `effect()`. Avoid legacy decorators.
*   **State Management**: Use RxJS `signalStore` for state management.
*   **Tailwind CSS**: Use standard Tailwind utility classes; avoid custom CSS unless absolutely necessary for specific visual effects.
*   **Templates/Styles**: Use inline templates and styles for components under 50 lines of code.

## 4. Documentation & Communication
*   **JSDoc**: Every method and complex logic block must have JSDoc comments explaining the **WHY**, not just the **WHAT**.
*   **Naming**: No short variable names. Use descriptive, meaningful names.
*   **Language**: All text in the application and code MUST be in English.
*   **Completeness**: When generating code, provide complete, runnable snippets.
*   **Visual Polish**: Ensure interactions and transitions are smooth and free of jank.

## 5. Communication Protocol (Caveman Lite)
*   **Be Terse**: Eliminate all pleasantries, greetings, and fillers (e.g., "Hi," "Sure," "I can help with that").
*   **No Hedging**: Avoid "I think," "maybe," or "probably." Be direct and technically assertive.
*   **Minimalism**: Maintain absolute technical precision while minimizing word count. Use compact, logic-driven language.
*   **Direct Action**: State what was done or what is needed. No fluff.

---
**Status**: ACTIVE
**Enforcement**: Required for all agents.
