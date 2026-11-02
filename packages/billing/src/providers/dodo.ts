import DodoPayments from "dodopayments";
import { BillingError } from "../errors";

let _dodoClient: DodoPayments | null = null;
export function getDodoClient(): DodoPayments {
  if (!_dodoClient) {
    if (!process.env.DODO_PAYMENTS_API_KEY) {
      throw new BillingError(
        "PRECONDITION_FAILED",
        "Dodo payment gateway is not configured",
      );
    }
    _dodoClient = new DodoPayments({
      bearerToken: process.env.DODO_PAYMENTS_API_KEY,
      environment: (process.env.DODO_PAYMENTS_ENVIRONMENT || "live_mode") as
        | "test_mode"
        | "live_mode",
    });
  }
  return _dodoClient;
}
