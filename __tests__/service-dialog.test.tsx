import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { ServiceDialog } from "@/app/(authenticated)/services/service-dialog";
import { updateService } from "@/app/(authenticated)/services/actions";
import type { ServiceView } from "@/app/(authenticated)/services/queries";

jest.mock("@/app/(authenticated)/services/actions", () => ({
   createService: jest.fn(),
   updateService: jest.fn(),
}));

const FORM_ID = "44444444-4444-4444-8444-444444444444";

const service: ServiceView = {
   id: "11111111-1111-4111-8111-111111111111",
   type: "private_lessons",
   isForChildren: true,
   formId: FORM_ID,
   scheduledAt: null,
   durationMinutes: 60,
   status: "active",
   stripeProductId: "prod_test",
   coordinatorId: "22222222-2222-4222-8222-222222222222",
   coordinatorIds: [],
   createdAt: new Date("2026-01-01T00:00:00Z"),
   updatedAt: new Date("2026-01-01T00:00:00Z"),
   title: "Reading support",
   description: "One-on-one reading help.",
   priceCents: 5000,
   priceCurrency: "cad",
   requiresSubscription: false,
   isScheduled: false,
};

beforeAll(() => {
   global.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
   };
});

describe("ServiceDialog (edit)", () => {
   it("shows the saved audience and form when reopened", () => {
      render(
         <ServiceDialog
            mode="edit"
            service={service}
            open
            onOpenChange={jest.fn()}
            coordinators={[]}
            forms={[{ id: FORM_ID, name: "Intake form" }]}
         />,
      );

      expect(
         screen.getByRole("checkbox", { name: "For children" }),
      ).toBeChecked();
      expect(
         screen.getByRole("combobox", { name: "Form (optional)" }),
      ).toHaveTextContent("Intake form");
      expect(
         document.querySelector<HTMLInputElement>('input[name="form_id"]')
            ?.value,
      ).toBe(FORM_ID);
      expect(
         document.querySelector<HTMLInputElement>(
            'input[name="is_for_children"]',
         )?.value,
      ).toBe("true");
   });

   it("shows why the form was rejected", async () => {
      jest.mocked(updateService).mockResolvedValue({
         errors: { form_id: ["The selected form no longer exists"] },
      });
      render(
         <ServiceDialog
            mode="edit"
            service={service}
            open
            onOpenChange={jest.fn()}
            coordinators={[]}
            forms={[{ id: FORM_ID, name: "Intake form" }]}
         />,
      );

      fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

      expect(
         await screen.findByText("The selected form no longer exists"),
      ).toBeInTheDocument();
   });
});
