// The CMS that serves landing and documentation content (NEXT_PUBLIC_CMS).
// Used when the toggle is unset: a download keeps only the CMS the buyer chose
// and pins this default to it.
const DEFAULT_CMS = "postgres";

export const getCmsProvider = () => process.env.NEXT_PUBLIC_CMS || DEFAULT_CMS;
