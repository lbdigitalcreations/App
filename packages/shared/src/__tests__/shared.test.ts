import { describe, expect, it } from 'vitest';
import {
  calculateOrderPricing,
  canTransitionProjectStatus,
  PaymentStatus,
  ProjectStatus,
  SiteStatus,
} from '../index';

describe('calculateOrderPricing', () => {
  it('computes 50% advance and 50% balance accurately with discounts and tax', () => {
    const result = calculateOrderPricing({
      basePrice: 4999,
      addOnsTotal: 1000,
      additionalCharges: 0,
      discountAmount: 500,
      taxPercent: 18,
      advancePercent: 50,
    });

    expect(result.subtotal).toBe(5999);
    expect(result.discountAmount).toBe(500);
    expect(result.taxableAmount).toBe(5499);
    expect(result.taxAmount).toBe(989.82);
    expect(result.totalPrice).toBe(6488.82);
    expect(result.advanceAmount).toBe(3244.41);
    expect(result.balanceAmount).toBe(3244.41);
  });

  it('caps discount at subtotal so total never goes negative', () => {
    const result = calculateOrderPricing({
      basePrice: 1000,
      discountAmount: 2500,
    });
    expect(result.totalPrice).toBe(0);
    expect(result.advanceAmount).toBe(0);
    expect(result.balanceAmount).toBe(0);
  });
});

describe('canTransitionProjectStatus', () => {
  it('blocks COMPLETED transition if payment is not FULLY_PAID', () => {
    const check = canTransitionProjectStatus(ProjectStatus.PUBLISHING, ProjectStatus.COMPLETED, {
      paymentStatus: PaymentStatus.ADVANCE_PAID,
      siteStatus: SiteStatus.PUBLISHED,
      balanceAmount: 2500,
    });
    expect(check.allowed).toBe(false);
  });

  it('blocks COMPLETED transition if site is not PUBLISHED', () => {
    const check = canTransitionProjectStatus(ProjectStatus.PUBLISHING, ProjectStatus.COMPLETED, {
      paymentStatus: PaymentStatus.FULLY_PAID,
      siteStatus: SiteStatus.PREVIEW,
      balanceAmount: 0,
    });
    expect(check.allowed).toBe(false);
  });

  it('allows COMPLETED transition when payment is FULLY_PAID and site is PUBLISHED', () => {
    const check = canTransitionProjectStatus(ProjectStatus.PUBLISHING, ProjectStatus.COMPLETED, {
      paymentStatus: PaymentStatus.FULLY_PAID,
      siteStatus: SiteStatus.PUBLISHED,
      balanceAmount: 0,
    });
    expect(check.allowed).toBe(true);
  });
});
