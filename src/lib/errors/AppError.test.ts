import { describe, it, expect } from "vitest";
import { AppError, ValidationError, NotFoundError, mapErrorToResponse } from "./AppError";

describe("AppError", () => {
  it("ValidationError has status 400", () => {
    const err = new ValidationError("bad input");
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe("VALIDATION_ERROR");
  });

  it("NotFoundError has status 404", () => {
    expect(new NotFoundError("missing").statusCode).toBe(404);
  });

  it("mapErrorToResponse maps AppError subclasses", () => {
    const result = mapErrorToResponse(new ValidationError("bad input"));
    expect(result).toEqual({ status: 400, body: { error: "bad input", code: "VALIDATION_ERROR" } });
  });

  it("mapErrorToResponse maps unknown errors to a generic 500 without leaking details", () => {
    const result = mapErrorToResponse(new Error("db connection string leaked"));
    expect(result.status).toBe(500);
    expect(result.body.error).toBe("Internal server error");
  });
});
