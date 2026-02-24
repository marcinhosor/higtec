import { useState, useCallback } from "react";
import { db } from "@/lib/storage";
import { trackEvent } from "@/lib/analytics";

export function useProGate() {
  const [showModal, setShowModal] = useState(false);
  const [blockedFeature, setBlockedFeature] = useState("");

  const checkPro = useCallback((featureName: string): boolean => {
    const company = db.getCompany();
    if (company.isPro) return true;
    setBlockedFeature(featureName);
    setShowModal(true);
    trackEvent("feature_locked_attempt", { feature: featureName });
    return false;
  }, []);

  return { showModal, setShowModal, blockedFeature, checkPro };
}
