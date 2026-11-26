import { PaymentStatus, ProjectStatus, SiteStatus } from './enums';

export const ALLOWED_PROJECT_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  [ProjectStatus.NEW]: [
    ProjectStatus.PAYMENT_PENDING,
    ProjectStatus.PAYMENT_VERIFIED,
    ProjectStatus.CANCELLED,
  ],
  [ProjectStatus.PAYMENT_PENDING]: [
    ProjectStatus.PAYMENT_VERIFIED,
    ProjectStatus.CANCELLED,
  ],
  [ProjectStatus.PAYMENT_VERIFIED]: [
    ProjectStatus.ACCEPTED,
    ProjectStatus.CANCELLED,
    ProjectStatus.REFUNDED,
  ],
  [ProjectStatus.ACCEPTED]: [
    ProjectStatus.IN_PROGRESS,
    ProjectStatus.CANCELLED,
    ProjectStatus.REFUNDED,
  ],
  [ProjectStatus.IN_PROGRESS]: [
    ProjectStatus.PREVIEW_READY,
    ProjectStatus.CANCELLED,
    ProjectStatus.REFUNDED,
  ],
  [ProjectStatus.PREVIEW_READY]: [
    ProjectStatus.REVISION_REQUESTED,
    ProjectStatus.APPROVED,
    ProjectStatus.CANCELLED,
  ],
  [ProjectStatus.REVISION_REQUESTED]: [
    ProjectStatus.IN_PROGRESS,
    ProjectStatus.PREVIEW_READY,
    ProjectStatus.CANCELLED,
  ],
  [ProjectStatus.APPROVED]: [
    ProjectStatus.BALANCE_PENDING,
    ProjectStatus.PUBLISHING,
    ProjectStatus.CANCELLED,
  ],
  [ProjectStatus.BALANCE_PENDING]: [
    ProjectStatus.PUBLISHING,
    ProjectStatus.CANCELLED,
  ],
  [ProjectStatus.PUBLISHING]: [
    ProjectStatus.COMPLETED,
    ProjectStatus.BALANCE_PENDING,
  ],
  [ProjectStatus.COMPLETED]: [
    ProjectStatus.REFUNDED,
  ],
  [ProjectStatus.CANCELLED]: [
    ProjectStatus.REFUNDED,
  ],
  [ProjectStatus.REFUNDED]: [],
};

export interface ProjectTransitionContext {
  paymentStatus: PaymentStatus;
  siteStatus?: SiteStatus | null;
  balanceAmount: number;
}

export interface TransitionCheckResult {
  allowed: boolean;
  reason?: string;
}

export function canTransitionProjectStatus(
  from: ProjectStatus,
  to: ProjectStatus,
  context: ProjectTransitionContext,
): TransitionCheckResult {
  if (from === to) {
    return { allowed: true };
  }

  const allowedTargets = ALLOWED_PROJECT_TRANSITIONS[from] ?? [];
  if (!allowedTargets.includes(to)) {
    return {
      allowed: false,
      reason: `Transition from ${from} to ${to} is not permitted.`,
    };
  }

  if (to === ProjectStatus.ACCEPTED && context.paymentStatus === PaymentStatus.PENDING) {
    return {
      allowed: false,
      reason: 'Advance payment must be verified before accepting the project.',
    };
  }

  if (to === ProjectStatus.PUBLISHING) {
    if (context.paymentStatus !== PaymentStatus.FULLY_PAID && context.balanceAmount > 0) {
      return {
        allowed: false,
        reason: 'Full balance payment must be verified before publishing.',
      };
    }
  }

  if (to === ProjectStatus.COMPLETED) {
    if (context.paymentStatus !== PaymentStatus.FULLY_PAID) {
      return {
        allowed: false,
        reason: 'Project cannot be marked COMPLETED until full payment is verified.',
      };
    }
    if (context.siteStatus !== SiteStatus.PUBLISHED) {
      return {
        allowed: false,
        reason: 'Project cannot be marked COMPLETED until the celebration website is published.',
      };
    }
  }

  return { allowed: true };
}
