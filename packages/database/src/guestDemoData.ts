export function buildGuestDemoData() {
  return {
    user: {
      email: process.env.DEMO_GUEST_EMAIL ?? "demo@saas-forge.dev",
      name: "Demo Guest",
      role: "guest" as const,
    },
  };
}
