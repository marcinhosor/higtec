import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type PlanTier = "free" | "pro" | "premium";

interface CompanyPlan {
  planTier: PlanTier;
  trialEndsAt: string | null;
  companyId: string | null;
  loading: boolean;
  isTrialActive: boolean;
  trialDaysRemaining: number;
  isPro: boolean;
  refresh: () => Promise<void>;
}

export function useCompanyPlan(): CompanyPlan {
  const { user } = useAuth();
  const [planTier, setPlanTier] = useState<PlanTier>("free");
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPlan = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Get user's company via profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile?.company_id) {
        setLoading(false);
        return;
      }

      setCompanyId(profile.company_id);

      const { data: company } = await supabase
        .from("companies")
        .select("plan_tier, trial_ends_at")
        .eq("id", profile.company_id)
        .maybeSingle();

      if (company) {
        setPlanTier((company.plan_tier as PlanTier) || "free");
        setTrialEndsAt(company.trial_ends_at);
      }
    } catch (err) {
      console.error("Error fetching company plan:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  const now = new Date();
  const trialEnd = trialEndsAt ? new Date(trialEndsAt) : null;
  const isTrialActive = trialEnd ? trialEnd > now : false;
  const trialDaysRemaining = trialEnd
    ? Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  const isPro = planTier === "pro" || planTier === "premium" || isTrialActive;

  return {
    planTier,
    trialEndsAt,
    companyId,
    loading,
    isTrialActive,
    trialDaysRemaining,
    isPro,
    refresh: fetchPlan,
  };
}
