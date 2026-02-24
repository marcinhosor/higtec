import { useState, useCallback } from "react";
import { db, PlanTier } from "@/lib/storage";
import { trackEvent } from "@/lib/analytics";

export function useProGate() {
  const [showModal, setShowModal] = useState(false);
  const [blockedFeature, setBlockedFeature] = useState("");
  const [requiredTier, setRequiredTier] = useState<"pro" | "premium">("pro");

  const tierLevel = (tier: PlanTier): number => {
    if (tier === "premium") return 2;
    if (tier === "pro") return 1;
    return 0;
  };

  /** Returns true if the user's plan meets the required tier */
  const checkAccess = useCallback((featureName: string, minTier: "pro" | "premium" = "pro"): boolean => {
    const company = db.getCompany();
    const userLevel = tierLevel(company.planTier);
    const requiredLevel = tierLevel(minTier);
    if (userLevel >= requiredLevel) return true;
    setBlockedFeature(featureName);
    setRequiredTier(minTier);
    setShowModal(true);
    trackEvent("feature_locked_attempt", { feature: featureName, required: minTier, current: company.planTier });
    return false;
  }, []);

  // Legacy compat
  const checkPro = useCallback((featureName: string): boolean => {
    return checkAccess(featureName, "pro");
  }, [checkAccess]);

  return { showModal, setShowModal, blockedFeature, requiredTier, checkPro, checkAccess };
}
