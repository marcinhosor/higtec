import { useState, useCallback } from "react";
import { useCompanyPlan, PlanTier } from "@/hooks/use-company-plan";
import { trackEvent } from "@/lib/analytics";

export function useProGate() {
  const [showModal, setShowModal] = useState(false);
  const [blockedFeature, setBlockedFeature] = useState("");
  const [requiredTier, setRequiredTier] = useState<"pro" | "premium">("pro");
  const { planTier, isPro, isTrialActive, loading } = useCompanyPlan();

  const tierLevel = (tier: PlanTier | string): number => {
    if (tier === "premium") return 2;
    if (tier === "pro") return 1;
    return 0;
  };

  const checkAccess = useCallback((featureName: string, minTier: "pro" | "premium" = "pro"): boolean => {
    // During trial, grant pro-level access
    const effectiveTier = isTrialActive && tierLevel(planTier) < 1 ? "pro" : planTier;
    const userLevel = tierLevel(effectiveTier);
    const requiredLevel = tierLevel(minTier);
    if (userLevel >= requiredLevel) return true;
    setBlockedFeature(featureName);
    setRequiredTier(minTier);
    setShowModal(true);
    trackEvent("feature_locked_attempt", { feature: featureName, required: minTier, current: planTier });
    return false;
  }, [planTier, isTrialActive]);

  const checkPro = useCallback((featureName: string): boolean => {
    return checkAccess(featureName, "pro");
  }, [checkAccess]);

  return { showModal, setShowModal, blockedFeature, requiredTier, checkPro, checkAccess, loading };
}
