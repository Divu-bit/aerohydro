import { ChevronLeft, ChevronRight, Droplets } from "lucide-react";
import StepIndicator from "./StepIndicator";
import { ReactNode } from "react";

interface OnboardingLayoutProps {
  step: number;
  totalSteps: number;
  title: string;
  icon: ReactNode;
  subtitle?: string;
  children: ReactNode;
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextIcon?: ReactNode;
}

const OnboardingLayout = ({
  step,
  totalSteps,
  title,
  icon,
  subtitle,
  children,
  onBack,
  onNext,
  nextLabel = "Next",
  nextIcon,
}: OnboardingLayoutProps) => {
  return (
    <div className="flex min-h-screen flex-col items-center bg-background px-6 pt-12 pb-8">
      <div className="w-full max-w-lg animate-fade-in">
        <StepIndicator totalSteps={totalSteps} currentStep={step} />

        <div className="mt-10 flex items-center gap-3">
          <span className="text-primary">{icon}</span>
          <h1 className="text-2xl font-semibold text-foreground leading-tight">{title}</h1>
        </div>

        {subtitle && (
          <p className="mt-3 text-sm text-muted-foreground">{subtitle}</p>
        )}

        <div className="mt-8">{children}</div>

        <div className="mt-16 flex items-center justify-between">
          {onBack ? (
            <button
              onClick={onBack}
              className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground active:scale-[0.97]"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
          ) : (
            <div />
          )}
          {onNext && (
            <button
              onClick={onNext}
              className="flex items-center gap-1.5 text-sm font-medium text-foreground transition-colors hover:text-primary active:scale-[0.97]"
            >
              {nextIcon}
              {nextLabel}
              {!nextIcon && <ChevronRight className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingLayout;
