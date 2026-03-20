import { watchSubscribeSchema } from '@/server/watch/watch-hub.types';

/** Valid UUIDv4 for use in tests. */
const TEST_CLIENT_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-e0f1a2b3c4d5';

describe('watchSubscribeSchema — userScoped', () => {
  it('accepts and preserves userScoped: true', () => {
    const result = watchSubscribeSchema.safeParse({
      clientId: TEST_CLIENT_ID,
      resourceType: 'apis/iam.miloapis.com/v1alpha1/userinvitations',
      userScoped: true,
    });
    expect(result.success).to.be.true;
    if (result.success) {
      expect(result.data.userScoped).to.equal(true);
    }
  });

  it('userScoped defaults to undefined when omitted', () => {
    const result = watchSubscribeSchema.safeParse({
      clientId: TEST_CLIENT_ID,
      resourceType: 'apis/iam.miloapis.com/v1alpha1/userinvitations',
    });
    expect(result.success).to.be.true;
    if (result.success) {
      expect(result.data.userScoped).to.be.undefined;
    }
  });

  it('accepts and preserves userScoped: false', () => {
    const result = watchSubscribeSchema.safeParse({
      clientId: TEST_CLIENT_ID,
      resourceType: 'apis/iam.miloapis.com/v1alpha1/userinvitations',
      userScoped: false,
    });
    expect(result.success).to.be.true;
    if (result.success) {
      expect(result.data.userScoped).to.equal(false);
    }
  });
});
