import { describe, it, expect } from "vitest";
import { isNewRecord } from "./records";

describe("isNewRecord", () => {
  it("is not a record on the first session (no previous best to beat)", () => {
    expect(isNewRecord(0.9, 10, null)).toBe(false);
  });

  it("is not a record when the session had no answers", () => {
    expect(isNewRecord(0, 0, 0.5)).toBe(false);
  });

  it("is a record when the score strictly beats the previous best", () => {
    expect(isNewRecord(0.86, 24, 0.79)).toBe(true);
  });

  it("is not a record when the score only ties the previous best", () => {
    expect(isNewRecord(0.79, 24, 0.79)).toBe(false);
  });

  it("is not a record when the score is below the previous best", () => {
    expect(isNewRecord(0.7, 24, 0.79)).toBe(false);
  });
});
