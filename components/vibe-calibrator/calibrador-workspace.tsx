"use client";

import { CalibratorConfigPanel } from "./calibrator-config-panel";
import { CalibratorProvider } from "./calibrator-context";
import { CalibratorSessionModal } from "./calibrator-session-modal";

export function CalibradorWorkspace() {
  return (
    <CalibratorProvider>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="flex flex-1 items-center justify-center px-4 py-10">
          <CalibratorConfigPanel />
        </div>
      </div>
      <CalibratorSessionModal />
    </CalibratorProvider>
  );
}
