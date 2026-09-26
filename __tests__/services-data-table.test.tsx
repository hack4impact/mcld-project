import "@testing-library/jest-dom";
import { render } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ServicesDataTable } from "@/app/(authenticated)/services/services-data-table";
import type { ServiceView } from "@/app/(authenticated)/services/queries";

jest.mock("@/app/(authenticated)/services/actions", () => ({
   setServiceStatus: jest.fn(),
}));

const service: ServiceView = {
   id: "11111111-1111-4111-8111-111111111111",
   type: "programs",
   isForChildren: false,
   formId: null,
   scheduledAt: { startDate: "2026-05-31", endDate: "2026-11-28", slots: [] },
   durationMinutes: 60,
   status: "active",
   stripeProductId: "prod_test",
   coordinatorId: null,
   createdAt: new Date("2026-01-01T00:00:00Z"),
   updatedAt: new Date("2026-01-01T00:00:00Z"),
   title: "Summer Robotics Program",
   description: null,
   priceCents: 10000,
   priceCurrency: "cad",
   requiresSubscription: false,
};

function renderTable() {
   return render(
      <TooltipProvider>
         <ServicesDataTable services={[service]} onEdit={jest.fn()} />
      </TooltipProvider>,
   );
}

describe("ServicesDataTable", () => {
   it("gives every column a width, and the widths total 100%", () => {
      const { container } = renderTable();

      const headers = Array.from(
         container.querySelectorAll("th"),
         (th) => th.textContent,
      );
      const widths = Array.from(
         container.querySelectorAll("col"),
         (col) => col.style.width,
      );

      expect(headers).toEqual([
         "Program",
         "Status",
         "Subscription",
         "Start Date",
         "End Date",
         "Actions",
      ]);
      expect(widths).toHaveLength(headers.length);
      expect(widths.every((w) => w.endsWith("%"))).toBe(true);
      expect(widths.reduce((sum, w) => sum + parseFloat(w), 0)).toBe(100);
   });
});
