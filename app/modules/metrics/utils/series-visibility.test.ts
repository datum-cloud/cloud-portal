import { nextHiddenSeries } from './series-visibility';
import { describe, expect, it } from 'bun:test';

const names = ['200', '404', '500'];

describe('nextHiddenSeries', () => {
  it('isolates the clicked series', () => {
    expect([...nextHiddenSeries(names, new Set(), '200')].sort()).toEqual(['404', '500']);
  });

  it('shows all series when the isolated series is clicked again', () => {
    const hidden = new Set(['404', '500']);
    expect(nextHiddenSeries(names, hidden, '200').size).toBe(0);
  });

  it('shift-click hides a series', () => {
    expect([...nextHiddenSeries(names, new Set(), '404', { shiftKey: true })]).toEqual(['404']);
  });

  it('shift-click shows a hidden series again', () => {
    const hidden = new Set(['404']);
    expect(nextHiddenSeries(names, hidden, '404', { shiftKey: true }).size).toBe(0);
  });

  it('does not hide the last visible series', () => {
    const hidden = new Set(['404', '500']);
    expect([...nextHiddenSeries(names, hidden, '200', { shiftKey: true })].sort()).toEqual([
      '404',
      '500',
    ]);
  });

  it('treats ctrl and meta like shift', () => {
    expect([...nextHiddenSeries(names, new Set(), '200', { ctrlKey: true })]).toEqual(['200']);
    expect([...nextHiddenSeries(names, new Set(), '200', { metaKey: true })]).toEqual(['200']);
  });
});
