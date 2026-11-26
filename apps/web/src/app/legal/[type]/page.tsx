export default async function LegalPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  const titles: Record<string, string> = {
    privacy: 'Privacy Policy (India DPDP Compliant)',
    terms: 'Terms of Service & Client Agreement',
    refund: 'Refund & Unlimited Revisions Policy',
  };
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 space-y-4">
      <h1 className="font-serif text-4xl font-bold text-ink">{titles[type] || 'Legal Policy'}</h1>
      <div className="lbdc-card p-8 space-y-4 text-sm leading-relaxed text-muted">
        <p>
          LB Digital Creations (LBDC) respects your privacy and protects your personal celebration
          media in accordance with applicable Indian data protection standards.
        </p>
        <p>
          Customer media assets are stored privately with signed access URLs and are only rendered on
          your celebration website upon preview generation or publication.
        </p>
        <p>
          Orders follow a 50% advance and 50% balance-on-approval model, backed by unlimited
          revisions prior to final approval.
        </p>
      </div>
    </div>
  );
}
