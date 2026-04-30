import { TestBed } from '@angular/core/testing';
import { WorkshopStore } from './workshop.store';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HARDWARE_INVENTORY, AVAILABLE_TRIGGERS, AVAILABLE_ACTIONS } from '../data/hardware-inventory.data';

describe('WorkshopStore', () => {
  let store: any;

  // Mock localStorage globally before store initialization
  vi.stubGlobal('localStorage', {
    getItem: vi.fn().mockReturnValue(null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [WorkshopStore],
    });
    store = TestBed.inject(WorkshopStore);
    // Note: WorkshopStore.migrateHardware() is called in onInit hook.
  });

  /**
   * WHY: Every processor has a hardware-defined 'routineCapacity'. 
   * Exceeding this would allow a drone to execute more tactical logic than its 
   * hardware can compute, breaking the RPG progression balance.
   */
  it('should enforce routineCapacity limits when adding new routines', () => {
    const activeShuriken = store.activeShuriken();
    // Default Abacus Chip has capacity 2
    const capacity = activeShuriken.processor.routineCapacity;
    
    // Attempt to add 5 routines
    for (let i = 0; i < 5; i++) {
      store.addRoutine();
    }

    expect(store.routines().length).toBeLessThanOrEqual(capacity);
    expect(store.routines().length).toBe(2);
  });

  /**
   * WHY: The 'semiAI' component (Swarm Master) is a high-tier tactical upgrade. 
   * It must automatically switch the drone to MASTER mode to enable swarm-wide 
   * coordination, or revert to SOLO if removed, ensuring the player cannot 
   * exploit Master-tier commands without the required hardware.
   */
  it('should automatically update coordinationMode when equipping/unequipping Semi-AI', () => {
    const shurikenId = store.activeShurikenId();
    const semiAI = HARDWARE_INVENTORY.semiAIs[0]; // Feral AI

    // 1. Equip Semi-AI
    store.equipComponent(shurikenId, 'semiAI', semiAI);
    expect(store.activeShuriken().coordinationMode).toBe('MASTER');

    // 2. Unequip Semi-AI
    store.equipComponent(shurikenId, 'semiAI', null);
    expect(store.activeShuriken().coordinationMode).toBe('SOLO');
  });

  /**
   * WHY: If a player attempts to add a routine when no processor is equipped 
   * (outlier case), the store must fallback to a baseline capacity (usually 2) 
   * to prevent the UI from locking up or throwing null pointer exceptions.
   */
  it('should handle routine allocation when processor is missing (outlier)', () => {
    const shurikenId = store.activeShurikenId();
    
    // Force processor to null via component swap
    store.equipComponent(shurikenId, 'processor', null);
    
    // Clear existing routines first if any
    const count = store.routines().length;
    for (let i = 0; i < count; i++) {
      store.removeRoutine(0);
    }

    // Attempt to add 5
    for (let i = 0; i < 5; i++) {
      store.addRoutine();
    }

    // Default fallback in store is 2
    expect(store.routines().length).toBe(2);
  });

  /**
   * WHY: Swapping a high-capacity processor for a low-capacity one should not 
   * delete the user's existing routines (to avoid data loss), but it should 
   * prevent adding *new* ones until the count is below the new limit.
   */
  it('should allow retaining existing routines when downgrading processor capacity', () => {
    const shurikenId = store.activeShurikenId();
    const highCapProc = HARDWARE_INVENTORY.processors[2]; // Omni-Node (Cap 5)
    const lowCapProc = HARDWARE_INVENTORY.processors[0];  // Abacus (Cap 2)

    // 1. Upgrade and fill slots
    store.equipComponent(shurikenId, 'processor', highCapProc);
    for (let i = 0; i < 5; i++) store.addRoutine();
    expect(store.routines().length).toBe(5);

    // 2. Downgrade
    store.equipComponent(shurikenId, 'processor', lowCapProc);
    
    // 3. Verify existing routines stay, but cannot add more
    expect(store.routines().length).toBe(5);
    store.addRoutine();
    expect(store.routines().length).toBe(5);
  });

  /**
   * WHY: System validity (isSystemValid) is used by the UI to enable/disable the 
   * 'Deploy' button. It must catch routines that are missing either a trigger or 
   * an action to prevent runtime errors in the combat simulation.
   */
  it('should invalidate system if any routine is incomplete', () => {
    const shurikenId = store.activeShurikenId();
    const highCapProc = HARDWARE_INVENTORY.processors[2]; // Omni-Node (Cap 5)
    
    // Ensure we have capacity to add an empty slot
    store.equipComponent(shurikenId, 'processor', highCapProc);

    // Start with default routines (usually 2, both valid)
    expect(store.isSystemValid()).toBe(true);

    // Add an empty routine
    store.addRoutine();
    expect(store.routines().length).toBe(3);
    expect(store.isSystemValid()).toBe(false);

    // Fill the empty routine
    const newIdx = store.routines().length - 1;
    store.setTrigger(newIdx, AVAILABLE_TRIGGERS[0]);
    store.setAction(newIdx, AVAILABLE_ACTIONS[0]);
    expect(store.isSystemValid()).toBe(true);
  });
});
