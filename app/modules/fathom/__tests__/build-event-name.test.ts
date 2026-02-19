import { buildEventName } from '../build-event-name';
import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

describe('buildEventName', () => {
  test('includes action and sub only when no org or project', () => {
    const result = buildEventName('create_org', 'john123');
    assert.equal(result, 'create_org | sub:john123');
  });

  test('includes org when provided', () => {
    const result = buildEventName('invite_collaborator', 'john123', 'acme-corp');
    assert.equal(result, 'invite_collaborator | sub:john123 | org:acme-corp');
  });

  test('includes org and project when both provided', () => {
    const result = buildEventName('add_proxy', 'john123', 'acme-corp', 'my-project');
    assert.equal(result, 'add_proxy | sub:john123 | org:acme-corp | proj:my-project');
  });

  test('skips org when undefined but includes project', () => {
    const result = buildEventName('add_secret', 'john123', undefined, 'my-project');
    assert.equal(result, 'add_secret | sub:john123 | proj:my-project');
  });

  test('skips org and project when both undefined', () => {
    const result = buildEventName('download_desktop_app', 'user-sub-456');
    assert.equal(result, 'download_desktop_app | sub:user-sub-456');
  });

  test('handles empty string org and project as falsy (skips them)', () => {
    const result = buildEventName('create_project', 'john123', '', '');
    assert.equal(result, 'create_project | sub:john123');
  });
});
