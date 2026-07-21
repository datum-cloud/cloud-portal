import { buildEventName } from '@/modules/fathom/build-event-name';

describe('buildEventName', () => {
  it('includes action and sub only when no org or project', () => {
    const result = buildEventName('create_org', 'john123');
    expect(result).to.equal('create_org | sub:john123');
  });

  it('includes org when provided', () => {
    const result = buildEventName('invite_collaborator', 'john123', 'acme-corp');
    expect(result).to.equal('invite_collaborator | sub:john123 | org:acme-corp');
  });

  it('includes org and project when both provided', () => {
    const result = buildEventName('add_proxy', 'john123', 'acme-corp', 'my-project');
    expect(result).to.equal('add_proxy | sub:john123 | org:acme-corp | proj:my-project');
  });

  it('skips org when undefined but includes project', () => {
    const result = buildEventName('add_secret', 'john123', undefined, 'my-project');
    expect(result).to.equal('add_secret | sub:john123 | proj:my-project');
  });

  it('skips org and project when both undefined', () => {
    const result = buildEventName('download_desktop_app', 'user-sub-456');
    expect(result).to.equal('download_desktop_app | sub:user-sub-456');
  });

  it('handles empty string org and project as falsy (skips them)', () => {
    const result = buildEventName('create_project', 'john123', '', '');
    expect(result).to.equal('create_project | sub:john123');
  });
});
