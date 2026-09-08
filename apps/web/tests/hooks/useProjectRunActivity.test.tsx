// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useProjectRunActivity } from '../../src/hooks/useProjectRunActivity';

describe('useProjectRunActivity', () => {
  it('starts idle and records the latest run-activity report', () => {
    const { result } = renderHook(() => useProjectRunActivity());
    expect(result.current.projectRunActivity).toEqual({ projectId: null, active: false });

    act(() => {
      result.current.handleProjectRunActivityChange('p1', true);
    });
    expect(result.current.projectRunActivity).toEqual({ projectId: 'p1', active: true });

    act(() => {
      result.current.handleProjectRunActivityChange('p1', false);
    });
    expect(result.current.projectRunActivity).toEqual({ projectId: 'p1', active: false });
  });
});
