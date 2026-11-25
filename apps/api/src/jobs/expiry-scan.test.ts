import { describe, expect, it } from 'vitest';
import {
  buildIdempotencyKey,
  computeReminderCandidates,
} from '../jobs/expiry-scan';

describe('computeReminderCandidates', () => {
  const settings = {
    reminderDaysBefore: [30, 15, 7],
    notifyOnExpiry: true,
    postExpiryWeekly: true,
    postExpiryIntervalDays: 7,
  };

  it('returns the nearest upcoming reminder that is still ahead', () => {
    expect(computeReminderCandidates(20, settings)).toEqual([
      { reminderType: 'BEFORE_EXPIRY', reminderDays: 30, bucket: 0 },
    ]);
    expect(computeReminderCandidates(7, settings)).toEqual([
      { reminderType: 'BEFORE_EXPIRY', reminderDays: 7, bucket: 0 },
    ]);
  });

  it('returns no upcoming reminder when the SIM is beyond the largest threshold', () => {
    expect(computeReminderCandidates(45, settings)).toEqual([]);
  });

  it('emits the on-expiry reminder on day zero', () => {
    expect(computeReminderCandidates(0, settings)).toEqual([
      { reminderType: 'ON_EXPIRY', reminderDays: 0, bucket: 0 },
    ]);
  });

  it('emits a post-expiry reminder for each elapsed weekly bucket', () => {
    expect(computeReminderCandidates(-8, settings)).toEqual([
      { reminderType: 'ON_EXPIRY', reminderDays: 0, bucket: 0 },
      { reminderType: 'POST_EXPIRY', reminderDays: 7, bucket: 1 },
    ]);
    expect(computeReminderCandidates(-15, settings)).toEqual([
      { reminderType: 'ON_EXPIRY', reminderDays: 0, bucket: 0 },
      { reminderType: 'POST_EXPIRY', reminderDays: 14, bucket: 2 },
    ]);
  });

  it('respects disabled reminder categories', () => {
    expect(
      computeReminderCandidates(-8, { ...settings, notifyOnExpiry: false, postExpiryWeekly: false }),
    ).toEqual([]);
  });
});

describe('buildIdempotencyKey', () => {
  it('builds a stable key from the SIM, cycle and reminder', () => {
    expect(
      buildIdempotencyKey({
        simId: 'sim-1',
        expiryDate: '2026-12-01',
        reminderType: 'BEFORE_EXPIRY',
        reminderDays: 30,
      }),
    ).toBe('sim-1:2026-12-01:BEFORE_EXPIRY:30:EMAIL');
  });

  it('supports alternate channels', () => {
    expect(
      buildIdempotencyKey({
        simId: 'sim-1',
        expiryDate: '2026-12-01',
        reminderType: 'ON_EXPIRY',
        reminderDays: 0,
        channel: 'SMS',
      }),
    ).toBe('sim-1:2026-12-01:ON_EXPIRY:0:SMS');
  });
});
