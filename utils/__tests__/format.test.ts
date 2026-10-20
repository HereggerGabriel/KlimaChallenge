import { formatKm } from "@/utils/format";

describe("formatKm", () => {
  it("rounds to at most two decimals and drops floating-point noise", () => {
    expect(formatKm(227.39999999999998)).toBe("227.4");
    expect(formatKm(0.1 + 0.2)).toBe("0.3");
    expect(formatKm(37.987)).toBe("37.99");
  });

  it("keeps whole numbers and single decimals as they are", () => {
    expect(formatKm(100)).toBe("100");
    expect(formatKm(37.9)).toBe("37.9");
  });

  it("handles invalid values", () => {
    expect(formatKm(NaN)).toBe("0");
  });
});
