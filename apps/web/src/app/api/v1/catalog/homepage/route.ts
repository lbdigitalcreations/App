import { NextResponse } from 'next/server';
import { SERVICES, PACKAGES, TEMPLATES } from '../data';

export async function GET() {
  return NextResponse.json({
    services: SERVICES,
    packages: PACKAGES,
    featuredTemplates: TEMPLATES.filter((t) => t.isFeatured),
    reviews: [
      {
        id: 'rev-1',
        authorName: 'Priya & Vikram Raman',
        eventTitle: 'Heritage Wedding at Taj Coromandel',
        rating: 5,
        reviewText:
          'LB Digital Creations made our wedding invitation unforgettable. Guests loved the RSVP and Google Maps location button.',
      },
      {
        id: 'rev-2',
        authorName: 'Sanjay Reddy',
        eventTitle: 'Father’s 60th Shashti Poorthi',
        rating: 5,
        reviewText:
          'Bespoke design, timely delivery, and exceptional support. Highly recommended for milestone celebrations!',
      },
    ],
    settings: {
      tagline: 'Creating Websites for Your Special Moments',
      email: 'lbdigitalcreations7326@gmail.com',
      phone: '+916381366088',
    },
  });
}
