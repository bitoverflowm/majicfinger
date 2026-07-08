"use client";

/**
 * @param {{
 *   step: import("@/lib/guidedWorkflows/types").GuidedStep;
 *   id?: string;
 *   className?: string;
 * }} props
 */
export function GuidedStepBody({ step, id, className }) {
  if (step.bodySegments?.length) {
    return (
      <p id={id} className={className}>
        {step.bodySegments.map((segment, i) =>
          segment.bold ? (
            <strong key={i} className="font-semibold text-foreground">
              {segment.text}
            </strong>
          ) : (
            <span key={i}>{segment.text}</span>
          ),
        )}
      </p>
    );
  }

  return (
    <p id={id} className={className}>
      {step.body}
    </p>
  );
}
