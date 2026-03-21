interface StepIndicatorProps {
  totalSteps: number;
  currentStep: number;
}

const StepIndicator = ({ totalSteps, currentStep }: StepIndicatorProps) => {
  return (
    <div className="flex items-center justify-center gap-1">
      {Array.from({ length: totalSteps }).map((_, i) => {
        const isCompleted = i < currentStep;
        const isCurrent = i === currentStep;
        return (
          <div key={i} className="flex items-center gap-1">
            <div
              className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${
                isCurrent
                  ? "bg-primary scale-110 shadow-[0_0_8px_hsl(205_90%_55%/0.5)]"
                  : isCompleted
                  ? "bg-primary"
                  : "bg-muted-foreground/30"
              }`}
            />
            {i < totalSteps - 1 && (
              <div
                className={`h-[2px] w-5 rounded-full transition-colors duration-300 ${
                  isCompleted ? "bg-primary" : "bg-muted-foreground/20"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default StepIndicator;
