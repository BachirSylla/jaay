import { describe, expect, it } from "vitest";
import { can } from "./permissions";

describe("can", () => {
  it("lets owner and admin see costs and manage members", () => {
    for (const role of ["owner", "admin"] as const) {
      expect(can(role, "viewCosts")).toBe(true);
      expect(can(role, "manageMembers")).toBe(true);
      expect(can(role, "viewReports")).toBe(true);
    }
  });

  it("hides costs, margins, supplier balances and reports from managers", () => {
    expect(can("manager", "viewCosts")).toBe(false);
    expect(can("manager", "viewSuppliers")).toBe(false);
    expect(can("manager", "viewReports")).toBe(false);
    expect(can("manager", "viewAllSales")).toBe(false);
    expect(can("manager", "manageMembers")).toBe(false);
    expect(can("manager", "cancelOperations")).toBe(false);
  });

  it("lets managers record operations and manage customers", () => {
    expect(can("manager", "recordSale")).toBe(true);
    expect(can("manager", "recordReception")).toBe(true);
    expect(can("manager", "recordReturn")).toBe(true);
    expect(can("manager", "recordExpense")).toBe(true);
    expect(can("manager", "manageCustomers")).toBe(true);
  });
});
