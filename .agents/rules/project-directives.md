# PROJECT DIRECTIVES: Rogue:BLADE

This document defines the mandatory "startup skill" for the Rogue:BLADE project. Any AI agent working on this repository must execute these instructions as their first step in every chat session.

## 1. Mandatory Reading
Before performing any research, code generation, or modification, you MUST read and internalize the following files:

1.  **[AGENT_CONTEXT.md](file:///c:/Antigravity/Rogue-BLADE/AGENT_CONTEXT.md)**: Role identity, tech stack, and general coding guidelines.
2.  **[docs/game_design.md](file:///c:/Antigravity/Rogue-BLADE/docs/game_design.md)**: The overall vision and feature set for Rogue:BLADE.
3.  **[docs/core_mechanics.md](file:///c:/Antigravity/Rogue-BLADE/docs/core_mechanics.md)**: The **Absolute Source of Truth** for all mathematical formulas, physics logic, and combat mechanics.

## 2. Core Compliance Rules

### A. Mathematical Integrity
*   **NEVER** modify or add mathematical formulas in the code that are not explicitly defined in `core_mechanics.md`.
*   Do **NOT** implement "feel-good" multipliers, balance tweaks, or arbitrary scaling factors unless they are first documented in the official mechanics file.
*   If a refinement is needed (e.g., for better gameplay feel), update `core_mechanics.md` **BEFORE** or **CONCURRENTLY** with the code change.

### B. Architectural Purity
*   Maintain the **Strict Phase Separation** (Workshop vs. Run).
*   Adhere to **Angular Signal-based APIs** (`input()`, `output()`, `viewChild()`).
*   Ensure all components are **Standalone** and use `OnPush` change detection.
*   Keep components focused: logic belongs in Services/Stores; UI belongs in Components.

### C. Documentation Priority
*   Every complex logic change must be accompanied by updated JSDoc comments.
*   Explain the **WHY**, not just the **WHAT**.

---
**Status**: ACTIVE
**Enforcement**: Required for all agents.
