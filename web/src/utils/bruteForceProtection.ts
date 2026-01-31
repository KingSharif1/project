interface LoginAttempt {
  email: string;
  timestamp: number;
  success: boolean;
}

interface BlockedUser {
  email: string;
  blockedUntil: number;
  attemptCount: number;
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000;
const ATTEMPT_WINDOW = 15 * 60 * 1000;

class BruteForceProtection {
  private attempts: LoginAttempt[] = [];
  private blockedUsers: Map<string, BlockedUser> = new Map();

  constructor() {
    this.loadFromStorage();
    this.startCleanupTimer();
  }

  private loadFromStorage() {
    try {
      const attemptsData = localStorage.getItem('login_attempts');
      const blockedData = localStorage.getItem('blocked_users');

      if (attemptsData) {
        this.attempts = JSON.parse(attemptsData);
      }

      if (blockedData) {
        const blocked = JSON.parse(blockedData);
        this.blockedUsers = new Map(Object.entries(blocked));
      }

      this.cleanupOldAttempts();
      this.cleanupExpiredBlocks();
    } catch (error) {
      console.error('Error loading brute force protection data:', error);
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem('login_attempts', JSON.stringify(this.attempts));
      const blockedObj = Object.fromEntries(this.blockedUsers);
      localStorage.setItem('blocked_users', JSON.stringify(blockedObj));
    } catch (error) {
      console.error('Error saving brute force protection data:', error);
    }
  }

  private cleanupOldAttempts() {
    const cutoffTime = Date.now() - ATTEMPT_WINDOW;
    this.attempts = this.attempts.filter(attempt => attempt.timestamp > cutoffTime);
  }

  private cleanupExpiredBlocks() {
    const now = Date.now();
    for (const [email, blocked] of this.blockedUsers.entries()) {
      if (blocked.blockedUntil < now) {
        this.blockedUsers.delete(email);
      }
    }
  }

  private startCleanupTimer() {
    setInterval(() => {
      this.cleanupOldAttempts();
      this.cleanupExpiredBlocks();
      this.saveToStorage();
    }, 60000);
  }

  isBlocked(email: string): boolean {
    const blocked = this.blockedUsers.get(email.toLowerCase());
    if (!blocked) return false;

    if (blocked.blockedUntil < Date.now()) {
      this.blockedUsers.delete(email.toLowerCase());
      this.saveToStorage();
      return false;
    }

    return true;
  }

  getBlockedUntil(email: string): Date | null {
    const blocked = this.blockedUsers.get(email.toLowerCase());
    if (!blocked || blocked.blockedUntil < Date.now()) {
      return null;
    }
    return new Date(blocked.blockedUntil);
  }

  getRemainingLockoutTime(email: string): number {
    const blocked = this.blockedUsers.get(email.toLowerCase());
    if (!blocked) return 0;

    const remaining = blocked.blockedUntil - Date.now();
    return Math.max(0, remaining);
  }

  recordAttempt(email: string, success: boolean): void {
    const attempt: LoginAttempt = {
      email: email.toLowerCase(),
      timestamp: Date.now(),
      success,
    };

    this.attempts.push(attempt);

    if (success) {
      this.attempts = this.attempts.filter(a => a.email !== email.toLowerCase());
      this.blockedUsers.delete(email.toLowerCase());
    } else {
      const recentFailures = this.getRecentFailedAttempts(email);

      if (recentFailures >= MAX_FAILED_ATTEMPTS) {
        this.blockUser(email);
      }
    }

    this.saveToStorage();
  }

  private getRecentFailedAttempts(email: string): number {
    const cutoffTime = Date.now() - ATTEMPT_WINDOW;
    return this.attempts.filter(
      attempt =>
        attempt.email === email.toLowerCase() &&
        !attempt.success &&
        attempt.timestamp > cutoffTime
    ).length;
  }

  private blockUser(email: string): void {
    const blocked: BlockedUser = {
      email: email.toLowerCase(),
      blockedUntil: Date.now() + LOCKOUT_DURATION,
      attemptCount: this.getRecentFailedAttempts(email),
    };

    this.blockedUsers.set(email.toLowerCase(), blocked);
    this.saveToStorage();
  }

  getAttemptCount(email: string): number {
    return this.getRecentFailedAttempts(email);
  }

  getRemainingAttempts(email: string): number {
    const attemptCount = this.getAttemptCount(email);
    return Math.max(0, MAX_FAILED_ATTEMPTS - attemptCount);
  }

  clearUserAttempts(email: string): void {
    this.attempts = this.attempts.filter(a => a.email !== email.toLowerCase());
    this.blockedUsers.delete(email.toLowerCase());
    this.saveToStorage();
  }

  getAllBlockedUsers(): BlockedUser[] {
    return Array.from(this.blockedUsers.values());
  }
}

export const bruteForceProtection = new BruteForceProtection();

export function formatLockoutTime(milliseconds: number): string {
  const minutes = Math.ceil(milliseconds / 60000);
  if (minutes < 1) return 'less than a minute';
  if (minutes === 1) return '1 minute';
  return `${minutes} minutes`;
}
