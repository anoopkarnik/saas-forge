import auth from "./auth.json";
import common from "./common.json";
import settings from "./settings.json";
// scaffold:begin billing
import billing from "./billing.json";
// scaffold:end billing
// scaffold:begin api_keys
import api_keys from "./api_keys.json";
// scaffold:end api_keys
// scaffold:begin webhooks
import webhooks from "./webhooks.json";
// scaffold:end webhooks

/** English is the source catalogue; its shape is the `Messages` type. */
const messages = {
  auth,
  common,
  settings,
  // scaffold:begin billing
  billing,
  // scaffold:end billing
  // scaffold:begin api_keys
  api_keys,
  // scaffold:end api_keys
  // scaffold:begin webhooks
  webhooks,
  // scaffold:end webhooks
};

export default messages;
