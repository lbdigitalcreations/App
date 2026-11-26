export default function FaqPage() {
  const faqs = [
    { q: 'How does the 50% advance model work?', a: 'Pay 50% advance to start design, review your interactive preview with unlimited revisions, and settle the 50% balance to publish live.' },
    { q: 'Can I upload my own photos and videos?', a: 'Yes! Moments Studio supports direct photo and video uploads with private signed URLs.' },
    { q: 'Can guests RSVP without creating an account?', a: 'Yes! Published celebration websites are open to your guests with optional password protection.' },
    { q: 'What payment methods are supported?', a: 'We support Razorpay (UPI, Cards, NetBanking) as well as admin-verified manual UPI transfers.' },
  ];
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 space-y-6">
      <h1 className="font-serif text-4xl font-bold text-ink">Frequently Asked Questions</h1>
      {faqs.map((f, i) => (
        <div key={i} className="lbdc-card p-6">
          <h2 className="font-serif text-lg font-bold text-ink">{f.q}</h2>
          <p className="mt-2 text-sm text-muted">{f.a}</p>
        </div>
      ))}
    </div>
  );
}
