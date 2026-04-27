import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { ShurikenStatus } from '../models/combat.model';

export const CombatStore = signalStore(
  { providedIn: 'root' },
  withState({
    enemyHull: 0,
    enemyMaxHull: 0,
    enemyShields: 0,
    enemyMaxShields: 0,
    squadStatuses: [] as ShurikenStatus[],
    logs: [] as string[],
    timeRemaining: 0,
    timeElapsed: 0,
    currentPolymer: 0,
    currentScrap: 0,
    currentCredits: 0,
    isFinished: false,
    success: false
  }),
  withMethods((store) => ({
    /**
     * Resets the combat state to its default values.
     * Used at the start of a new mission or when abandoning a strike.
     */
    reset() {
      patchState(store, {
        enemyHull: 0,
        enemyMaxHull: 0,
        enemyShields: 0,
        enemyMaxShields: 0,
        squadStatuses: [],
        logs: [],
        timeRemaining: 0,
        timeElapsed: 0,
        currentPolymer: 0,
        currentScrap: 0,
        currentCredits: 0,
        isFinished: false,
        success: false
      });
    },

    /**
     * Initializes the combat state with the mission parameters.
     * @param enemyHull The initial health points of the target entity.
     * @param shurikens The initial status of all squad members.
     * @param duration The total time allocated for the mission in seconds.
     */
    setInitialState(enemyHull: number, shurikens: ShurikenStatus[], duration: number) {
      patchState(store, {
        enemyHull,
        enemyMaxHull: enemyHull,
        squadStatuses: shurikens,
        timeRemaining: duration,
        logs: [`[SYSTEM] STRIKE INITIATED.`]
      });
    },

    /**
     * Updates the mission clock.
     * @param elapsed Total time passed since combat started.
     * @param remaining Time left before mission timeout.
     */
    updateTime(elapsed: number, remaining: number) {
      patchState(store, { timeElapsed: elapsed, timeRemaining: remaining });
    },

    /**
     * Updates the current hull integrity of the enemy target.
     * @param hull Remaining health points of the hostile entity.
     */
    updateEnemyHull(hull: number) {
      patchState(store, { enemyHull: hull });
    },

    /**
     * Updates the current shield capacity of the enemy target.
     * @param shields Remaining shield energy of the hostile entity.
     */
    updateEnemyShields(shields: number) {
      patchState(store, { enemyShields: shields });
    },

    /**
     * Updates the vital telemetry for the entire squad.
     * @param statuses Array containing current HP, Energy, and Reboot status for all drones.
     */
    updateSquadStatus(statuses: ShurikenStatus[]) {
      patchState(store, { squadStatuses: statuses });
    },

    /**
     * Updates the currently recovered loot values.
     * @param polymer Amount of industrial polymer collected.
     * @param scrap Amount of technical scrap collected.
     * @param credits Amount of digital currency credits secured.
     */
    updateLoot(polymer: number, scrap: number, credits: number) {
      patchState(store, { currentPolymer: polymer, currentScrap: scrap, currentCredits: credits });
    },

    /**
     * Marks the mission as finished and records the outcome.
     * @param success Whether the primary objective was neutralized.
     */
    setFinished(success: boolean) {
      patchState(store, { isFinished: true, success });
    },

    /**
     * Adds a new entry to the tactical log.
     * @param log The formatted string to be displayed in the live feed.
     */
    addLog(log: string) {
      patchState(store, (state) => ({ logs: [...state.logs, log] }));
    }
  }))
);
