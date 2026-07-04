import { cn } from "@/lib/utils";

interface Step {
  number: number;
  label: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-0 w-full max-w-2xl mx-auto">
      {steps.map((step, index) => {
        const isCompleted = step.number < currentStep;
        const isActive = step.number === currentStep;
        const isLast = index === steps.length - 1;

        return (
          <div key={step.number} className="flex items-center flex-1 last:flex-none">
            {/* Step circle + label */}
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors",
                  isActive
                    ? "bg-[#00488d] border-[#00488d] text-white"
                    : isCompleted
                    ? "bg-[#00488d] border-[#00488d] text-white"
                    : "bg-white border-[#d1d5db] text-[#9ca3af]"
                )}
              >
                {step.number}
              </div>
              <span
                className={cn(
                  "text-[12px] font-medium whitespace-nowrap",
                  isActive || isCompleted ? "text-[#111827]" : "text-[#9ca3af]"
                )}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {!isLast && (
              <div
                className={cn(
                  "flex-1 h-[2px] mx-3 mb-5",
                  isCompleted ? "bg-[#00488d]" : "bg-[#e5e7eb]"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
