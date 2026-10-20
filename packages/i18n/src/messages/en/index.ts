import auth from "./auth.json";
import common from "./common.json";
import email from "./email.json";
import home from "./home.json";
import landing from "./landing.json";
import nav from "./nav.json";
import settings from "./settings.json";
import billing from "./billing.json";
import multi_tenancy from "./multi_tenancy.json";
import api_keys from "./api_keys.json";
import jobs from "./jobs.json";
import notifications from "./notifications.json";
import audit_log from "./audit_log.json";
import webhooks from "./webhooks.json";
import feature_flags from "./feature_flags.json";
import analytics from "./analytics.json";

/** English is the source catalogue; its shape is the `Messages` type. */
const messages = {
  auth,
  common,
  email,
  home,
  landing,
  nav,
  settings,
  billing,
  multi_tenancy,
  api_keys,
  jobs,
  notifications,
  audit_log,
  webhooks,
  feature_flags,
  analytics,
};

export default messages;
