import { AccountSignInMethodSettingsCard } from '@/features/account/cards/sign-in-method-card';
// Both cards below are hidden. Kept commented rather than deleted so
// re-enabling is a one-liner.
//
// 2FA: two of its three rows (TOTP, Recovery Codes) can only render a disabled
// "Coming Soon" button — no API exposes enrolled auth methods, and recovery
// codes do not exist platform-wide. Team review asked that placeholder rows not
// ship. Nothing is lost by hiding it: the Sign-in Methods passkeys row already
// offers Add/Manage against the same /id/passkeys destination.
//
// Team auth: waiting on an org SSO/SAML API (passkey roadmap C4, parked).
// import { Account2FACard } from '@/features/account/cards/2fa-card';
// import { AccountTeamAuthCard } from '@/features/account/cards/team-auth-card';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { Col, Row } from '@datum-cloud/datum-ui/grid';
import type { MetaFunction } from 'react-router';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Security');
});

export default function AccountSecuritySettingsPage() {
  return (
    <Row gutter={[0, 16]}>
      <Col span={24}>
        <AccountSignInMethodSettingsCard />
      </Col>
      {/* <Col span={24}>
        <Account2FACard />
      </Col>
      <Col span={24}>
        <AccountTeamAuthCard />
      </Col> */}
    </Row>
  );
}
