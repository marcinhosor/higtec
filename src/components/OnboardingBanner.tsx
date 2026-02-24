import { useState, useEffect } from "react";
import { X, Crown, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getOnboardingMessage, getSubscription, getTrialDaysRemaining } from "@/lib/analytics";
import { useNavigate } from "react-router-dom";

export default function OnboardingBanner() {
  const [message, setMessage] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const msg = getOnboardingMessage();
    setMessage(msg);
  }, []);

  if (!message || dismissed) return null;

  const sub = getSubscription();
  const isTrialWarning = sub.subscriptionStatus === 'trial' && getTrialDaysRemaining() <= 3;

  return (
    <div className={`relative mx-4 mb-3 overflow-hidden rounded-xl border px-4 py-3 ${
      isTrialWarning
        ? 'border-[hsl(38,92%,50%,0.3)] bg-gradient-to-r from-[hsl(38,92%,50%,0.08)] to-[hsl(38,92%,50%,0.03)]'
        : 'border-[hsl(207,90%,54%,0.2)] bg-gradient-to-r from-[hsl(207,90%,54%,0.06)] to-transparent'
    }`}>
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground hover:bg-accent"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          isTrialWarning ? 'bg-[hsl(38,92%,50%,0.15)]' : 'bg-primary/10'
        }`}>
          <Crown className={`h-4 w-4 ${isTrialWarning ? 'text-[hsl(38,92%,50%)]' : 'text-primary'}`} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground leading-snug">{message}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/checkout")}
            className="mt-1.5 h-7 px-2 text-xs font-semibold text-primary hover:text-primary"
          >
            Conhecer PRO <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
