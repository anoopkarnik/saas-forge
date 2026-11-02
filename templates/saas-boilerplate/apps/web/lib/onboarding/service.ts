import { getOnboarding as readOnboarding } from "@workspace/onboarding/service";
import { getSiteConfig } from "@/lib/site-config/service";
export {
  WIZARD_STEPS,
  OnboardingTaskError,
  saveAnswers,
  setWizardOpen,
  setChecklistDismissed,
  completeTask,
} from "@workspace/onboarding/service";
export type { OnboardingView } from "@workspace/onboarding/service";

export async function getOnboarding(
  userId: string,
  options: { checklistFlag?: boolean } = {},
) {
  const config = await getSiteConfig();
  return readOnboarding(userId, {
    ...options,
    wizardEnabled: config["onboarding.wizard"],
    checklistEnabled: config["onboarding.checklist"],
  });
}
