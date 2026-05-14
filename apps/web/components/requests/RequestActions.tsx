"use client";

import { IntakeActions } from "./IntakeActions";
import { RequestProgressCard } from "./RequestProgressCard";

export function RequestActions(props: any) {
  return (
    <div className="space-y-4">
      <RequestProgressCard request={props.request} canOpenProject />
      <IntakeActions {...props} />
    </div>
  );
}

export default RequestActions;
