import { useCallback, useState } from 'react';

/** Which project (if any) currently reports an active run. */
export interface ProjectRunActivity {
  projectId: string | null;
  active: boolean;
}

const IDLE_PROJECT_RUN_ACTIVITY: ProjectRunActivity = { projectId: null, active: false };

/**
 * Run-activity flag raised by the project surface (`onRunActivityChange`)
 * and read by the memory-toast gate. Extracted from `AppInner` because the
 * boundary is closed: exactly one writer, two readers, no effects and no
 * shared refs — so the hook owns nothing beyond its own cell.
 */
export function useProjectRunActivity() {
  const [projectRunActivity, setProjectRunActivity] = useState<ProjectRunActivity>(
    IDLE_PROJECT_RUN_ACTIVITY,
  );
  const handleProjectRunActivityChange = useCallback((projectId: string, active: boolean) => {
    setProjectRunActivity({ projectId, active });
  }, []);
  return { projectRunActivity, handleProjectRunActivityChange };
}
