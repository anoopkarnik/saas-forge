import auth from "./auth.json";
import common from "./common.json";
import email from "./email.json";
import home from "./home.json";
import landing from "./landing.json";
import nav from "./nav.json";
import settings from "./settings.json";
// scaffold:begin billing
import billing from "./billing.json";
// scaffold:end billing
// scaffold:begin multi_tenancy
import multi_tenancy from "./multi_tenancy.json";
// scaffold:end multi_tenancy
// scaffold:begin api_keys
import api_keys from "./api_keys.json";
// scaffold:end api_keys
// scaffold:begin jobs
import jobs from "./jobs.json";
// scaffold:end jobs
// scaffold:begin notifications
import notifications from "./notifications.json";
// scaffold:end notifications
// scaffold:begin audit_log
import audit_log from "./audit_log.json";
// scaffold:end audit_log
// scaffold:begin webhooks
import webhooks from "./webhooks.json";
// scaffold:end webhooks
// scaffold:begin feature_flags
import feature_flags from "./feature_flags.json";
// scaffold:end feature_flags

/** English is the source catalogue; its shape is the `Messages` type. */
const messages = {
  auth,
  common,
  email,
  home,
  landing,
  nav,
  settings,
  // scaffold:begin billing
  billing,
  // scaffold:end billing
  // scaffold:begin multi_tenancy
  multi_tenancy,
  // scaffold:end multi_tenancy
  // scaffold:begin api_keys
  api_keys,
  // scaffold:end api_keys
  // scaffold:begin jobs
  jobs,
  // scaffold:end jobs
  // scaffold:begin notifications
  notifications,
  // scaffold:end notifications
  // scaffold:begin audit_log
  audit_log,
  // scaffold:end audit_log
  // scaffold:begin webhooks
  webhooks,
  // scaffold:end webhooks
  // scaffold:begin feature_flags
  feature_flags,
  // scaffold:end feature_flags
};

export default messages;
