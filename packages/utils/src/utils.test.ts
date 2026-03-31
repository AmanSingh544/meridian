import { describe, it, expect } from 'vitest';
import {
  isValidTransition, getAvailableTransitions,
  getStatusLabel, getPriorityLabel,
  formatFileSize, getInitials, truncate, clamp,
  formatRelativeTime, getTimeRemaining,
  getSLASeverity,
} from '@3sc/utils';
import { TicketStatus, TicketPriority, SLAState } from '@3sc/types';
import type { SLAInfo } from '@3sc/types';

describe('Ticket State Machine', () => {
  describe('isValidTransition', () => {
    it('allows Open → Acknowledged', () => {
      expect(isValidTransition(TicketStatus.OPEN, TicketStatus.ACKNOWLEDGED)).toBe(true);
    });

    it('allows Open → In Progress', () => {
      expect(isValidTransition(TicketStatus.OPEN, TicketStatus.IN_PROGRESS)).toBe(true);
    });

    it('allows Open → Closed', () => {
      expect(isValidTransition(TicketStatus.OPEN, TicketStatus.CLOSED)).toBe(true);
    });

    it('blocks Open → Resolved (must go through In Progress)', () => {
      expect(isValidTransition(TicketStatus.OPEN, TicketStatus.RESOLVED)).toBe(false);
    });

    it('allows In Progress → Resolved', () => {
      expect(isValidTransition(TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED)).toBe(true);
    });

    it('allows Resolved → Closed', () => {
      expect(isValidTransition(TicketStatus.RESOLVED, TicketStatus.CLOSED)).toBe(true);
    });

    it('allows Resolved → Open (reopen)', () => {
      expect(isValidTransition(TicketStatus.RESOLVED, TicketStatus.OPEN)).toBe(true);
    });

    it('allows Closed → Open (reopen)', () => {
      expect(isValidTransition(TicketStatus.CLOSED, TicketStatus.OPEN)).toBe(true);
    });

    it('blocks Closed → In Progress (invalid jump)', () => {
      expect(isValidTransition(TicketStatus.CLOSED, TicketStatus.IN_PROGRESS)).toBe(false);
    });

    it('blocks Acknowledged → Open (backward)', () => {
      expect(isValidTransition(TicketStatus.ACKNOWLEDGED, TicketStatus.OPEN)).toBe(false);
    });

    it('blocks In Progress → Acknowledged (backward)', () => {
      expect(isValidTransition(TicketStatus.IN_PROGRESS, TicketStatus.ACKNOWLEDGED)).toBe(false);
    });
  });

  describe('getAvailableTransitions', () => {
    it('returns correct transitions for Open', () => {
      const transitions = getAvailableTransitions(TicketStatus.OPEN);
      expect(transitions).toContain(TicketStatus.ACKNOWLEDGED);
      expect(transitions).toContain(TicketStatus.IN_PROGRESS);
      expect(transitions).toContain(TicketStatus.CLOSED);
      expect(transitions).not.toContain(TicketStatus.RESOLVED);
    });

    it('returns correct transitions for Closed', () => {
      const transitions = getAvailableTransitions(TicketStatus.CLOSED);
      expect(transitions).toEqual([TicketStatus.OPEN]);
    });

    it('returns correct transitions for In Progress', () => {
      const transitions = getAvailableTransitions(TicketStatus.IN_PROGRESS);
      expect(transitions).toContain(TicketStatus.RESOLVED);
      expect(transitions).toContain(TicketStatus.CLOSED);
      expect(transitions).not.toContain(TicketStatus.OPEN);
    });
  });
});

describe('Label Utilities', () => {
  it('returns correct status labels', () => {
    expect(getStatusLabel(TicketStatus.OPEN)).toBe('Open');
    expect(getStatusLabel(TicketStatus.IN_PROGRESS)).toBe('In Progress');
    expect(getStatusLabel(TicketStatus.RESOLVED)).toBe('Resolved');
    expect(getStatusLabel(TicketStatus.CLOSED)).toBe('Closed');
  });

  it('returns correct priority labels', () => {
    expect(getPriorityLabel(TicketPriority.LOW)).toBe('Low');
    expect(getPriorityLabel(TicketPriority.CRITICAL)).toBe('Critical');
  });
});

describe('String Utilities', () => {
  it('truncates long strings', () => {
    expect(truncate('Hello World', 5)).toBe('Hell…');
    expect(truncate('Hi', 10)).toBe('Hi');
  });

  it('gets initials', () => {
    expect(getInitials('John Doe')).toBe('JD');
    expect(getInitials('Alice')).toBe('A');
    expect(getInitials('A B C D')).toBe('AB');
  });
});

describe('File Utilities', () => {
  it('formats file sizes', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1536)).toBe('1.5 KB');
    expect(formatFileSize(1048576)).toBe('1 MB');
    expect(formatFileSize(2621440)).toBe('2.5 MB');
  });
});

describe('Number Utilities', () => {
  it('clamps values', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });
});

describe('Date Utilities', () => {
  it('formats relative time', () => {
    const now = new Date();
    expect(formatRelativeTime(now.toISOString())).toBe('just now');

    const fiveMin = new Date(now.getTime() - 5 * 60 * 1000);
    expect(formatRelativeTime(fiveMin.toISOString())).toBe('5m ago');

    const twoHours = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    expect(formatRelativeTime(twoHours.toISOString())).toBe('2h ago');

    const threeDays = new Date(now.getTime() - 3 * 86400000);
    expect(formatRelativeTime(threeDays.toISOString())).toBe('3d ago');
  });

  it('computes time remaining', () => {
    const future = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const result = getTimeRemaining(future);
    expect(result.isOverdue).toBe(false);
    expect(result.hours).toBeGreaterThanOrEqual(1);

    const past = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const overdue = getTimeRemaining(past);
    expect(overdue.isOverdue).toBe(true);
  });
});

describe('SLA Utilities', () => {
  const baseSLA: SLAInfo = {
    responseDeadline: new Date(Date.now() + 3600000).toISOString(),
    resolutionDeadline: new Date(Date.now() + 86400000).toISOString(),
    responseState: SLAState.ON_TRACK,
    resolutionState: SLAState.ON_TRACK,
    responseMet: false,
    resolutionMet: false,
  };

  it('returns ok when on track', () => {
    expect(getSLASeverity(baseSLA)).toBe('ok');
  });

  it('returns warning when at risk', () => {
    expect(getSLASeverity({ ...baseSLA, resolutionState: SLAState.AT_RISK })).toBe('warning');
  });

  it('returns critical when breached', () => {
    expect(getSLASeverity({ ...baseSLA, responseState: SLAState.BREACHED })).toBe('critical');
  });
});
