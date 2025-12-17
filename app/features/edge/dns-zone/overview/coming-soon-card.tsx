import { ComingSoonFeatureCard } from '@/components/coming-soon/coming-soon-feature-card';
import { Col, Row } from '@datum-ui/components';

export const ComingSoonCard = () => {
  const FEATURES = [
    {
      title: 'DNSSEC',
      description:
        'DNSSEC uses a cryptographic signature of published DNS records to protect your domain against forged DNS answers.',
    },
    {
      title: 'Multi-signer DNSSEC',
      description:
        'Multi-signer DNSSEC allows Cloudflare and your other authoritative DNS providers to serve the same zone and have DNSSEC enabled at the same time.',
    },
    {
      title: 'Multi-provider DNS',
      description:
        'Multi-provider DNS allows domains using a full DNS setup to be active on Datum while using another authoritative DNS provider, in addition to Datum. Also allows the domain to serve any apex NS records added to its DNS configuration at Datum.',
    },
  ];
  return (
    <Row gutter={[0, 16]}>
      {FEATURES.map((feature, index) => (
        <Col span={24} key={`coming-soon-feature-${index}`}>
          <ComingSoonFeatureCard title={feature.title} description={feature.description} />
        </Col>
      ))}
    </Row>
  );
};
