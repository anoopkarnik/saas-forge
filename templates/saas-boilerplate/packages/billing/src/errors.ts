export class BillingError extends Error {
  constructor(
    public readonly code: "BAD_REQUEST" | "PRECONDITION_FAILED",
    message: string,
  ) {
    super(message);
    this.name = "BillingError";
  }
}
