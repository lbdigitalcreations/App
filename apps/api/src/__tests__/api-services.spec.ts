import { describe, expect, it } from 'vitest';
import {
  calculateOrderPricing,
  canTransitionProjectStatus,
  PaymentStatus,
  ProjectStatus,
  SiteStatus,
} from '@lbdc/shared';
import { StorageService } from '../storage/storage.service';

describe('LBDC API Core Security & Business Logic Unit Tests', () => {
  it('validates HMAC signed media URLs and rejects tampered or expired tokens', () => {
    const mockConfig = {
      get: (key: string) =>
        key === 'SIGNED_URL_SECRET'
          ? 'unit-test-secret'
          : key === 'LOCAL_UPLOAD_DIR'
            ? './uploads'
            : undefined,
    } as any;
    const storage = new StorageService({} as any, mockConfig);

    const url = storage.generateSignedUrl('asset-uuid-123', 60);
    const parsed = new URL(`http://localhost${url}`);
    const exp = parsed.searchParams.get('exp')!;
    const sig = parsed.searchParams.get('sig')!;

    expect(storage.verifySignedUrl('asset-uuid-123', exp, sig)).toBe(true);
    expect(storage.verifySignedUrl('asset-uuid-other', exp, sig)).toBe(false);
    expect(storage.verifySignedUrl('asset-uuid-123', '1000', sig)).toBe(false);
  });

  it('prevents marking a project COMPLETED before payment and publishing conditions are met', () => {
    const unpaid = canTransitionProjectStatus(ProjectStatus.PUBLISHING, ProjectStatus.COMPLETED, {
      paymentStatus: PaymentStatus.ADVANCE_PAID,
      siteStatus: SiteStatus.PUBLISHED,
      balanceAmount: 2000,
    });
    expect(unpaid.allowed).toBe(false);

    const unpublished = canTransitionProjectStatus(ProjectStatus.PUBLISHING, ProjectStatus.COMPLETED, {
      paymentStatus: PaymentStatus.FULLY_PAID,
      siteStatus: SiteStatus.PREVIEW,
      balanceAmount: 0,
    });
    expect(unpublished.allowed).toBe(false);

    const valid = canTransitionProjectStatus(ProjectStatus.PUBLISHING, ProjectStatus.COMPLETED, {
      paymentStatus: PaymentStatus.FULLY_PAID,
      siteStatus: SiteStatus.PUBLISHED,
      balanceAmount: 0,
    });
    expect(valid.allowed).toBe(true);
  });

  it('calculates 50% advance, 50% balance, discounts, and additional charges accurately', () => {
    const p = calculateOrderPricing({
      basePrice: 3999,
      addOnsTotal: 499,
      additionalCharges: 200,
      discountAmount: 400,
      advancePercent: 50,
    });
    expect(p.subtotal).toBe(4698);
    expect(p.totalPrice).toBe(4298);
    expect(p.advanceAmount).toBe(2149);
    expect(p.balanceAmount).toBe(2149);
  });
});
