export const selectOptions: Record<string, { value: string; label: string }[]> = {
    NEXT_PUBLIC_THEME: [
      { value: "blue", label: "Blue" },
      { value: "green", label: "Green" },
      { value: "neutral", label: "Neutral" },
      { value: "orange", label: "Orange" },
      { value: "red", label: "Red" },
      { value: "rose", label: "Rose" },
      { value: "violet", label: "Violet" },
      { value: "yellow", label: "Yellow" },
    ],
    NEXT_PUBLIC_THEME_TYPE: [
      { value: "light", label: "Light" },
      { value: "dark", label: "Dark" },
      { value: "system", label: "System" },
    ],
    DODO_PAYMENTS_ENVIRONMENT: [
      { value: "test_mode", label: "Test Mode" },
      { value: "live_mode", label: "Live Mode" },
    ],
  };