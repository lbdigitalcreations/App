export interface OrderPricingInput {
  basePrice: number;
  addOnsTotal?: number;
  additionalCharges?: number;
  discountAmount?: number;
  taxPercent?: number;
  advancePercent?: number;
}

export interface OrderPricingBreakdown {
  basePrice: number;
  addOnsTotal: number;
  additionalCharges: number;
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  totalPrice: number;
  advanceAmount: number;
  balanceAmount: number;
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateOrderPricing(input: OrderPricingInput): OrderPricingBreakdown {
  const basePrice = Math.max(0, roundCurrency(input.basePrice));
  const addOnsTotal = Math.max(0, roundCurrency(input.addOnsTotal ?? 0));
  const additionalCharges = Math.max(0, roundCurrency(input.additionalCharges ?? 0));
  const subtotal = roundCurrency(basePrice + addOnsTotal + additionalCharges);

  const rawDiscount = Math.max(0, roundCurrency(input.discountAmount ?? 0));
  const discountAmount = Math.min(subtotal, rawDiscount);
  const taxableAmount = roundCurrency(subtotal - discountAmount);

  const taxPercent = Math.max(0, input.taxPercent ?? 0);
  const taxAmount = roundCurrency((taxableAmount * taxPercent) / 100);
  const totalPrice = roundCurrency(taxableAmount + taxAmount);

  const advancePercent = Math.min(100, Math.max(0, input.advancePercent ?? 50));
  const advanceAmount = roundCurrency((totalPrice * advancePercent) / 100);
  const balanceAmount = roundCurrency(totalPrice - advanceAmount);

  return {
    basePrice,
    addOnsTotal,
    additionalCharges,
    subtotal,
    discountAmount,
    taxableAmount,
    taxAmount,
    totalPrice,
    advanceAmount,
    balanceAmount,
  };
}
