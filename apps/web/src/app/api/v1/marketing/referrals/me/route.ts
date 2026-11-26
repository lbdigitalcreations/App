import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    referralCode: 'LBDC' + Math.floor(1000 + Math.random() * 9000),
    successfulReferrals: 0,
    totalRewards: 0,
    pendingRewards: 0,
  });
}
