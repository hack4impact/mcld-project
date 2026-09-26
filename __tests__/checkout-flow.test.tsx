import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CheckoutFlow } from "@/app/checkout/[productId]/checkout-flow";
import type { ServiceView } from "@/app/(authenticated)/services/queries";

const startPrivateLessonCheckout = jest.fn();
const checkoutServiceBooking = jest.fn();

jest.mock("@/app/checkout/actions", () => ({
   startPrivateLessonCheckout: (...args: unknown[]) =>
      startPrivateLessonCheckout(...args),
   checkoutServiceBooking: (...args: unknown[]) =>
      checkoutServiceBooking(...args),
}));

jest.mock("@/components/scheduling/availability-calendar", () => ({
   AvailabilityCalendar: () => <div data-testid="availability-calendar" />,
}));

jest.mock("sonner", () => ({ toast: { error: jest.fn() } }));

function service(overrides: Partial<ServiceView>): ServiceView {
   return {
      id: "22222222-2222-2222-2222-222222222222",
      type: "private_lessons",
      isForChildren: false,
      formId: null,
      scheduledAt: null,
      durationMinutes: 60,
      status: "active",
      stripeProductId: "prod_1",
      coordinatorId: "33333333-3333-3333-3333-333333333333",
      createdAt: new Date(),
      updatedAt: new Date(),
      title: "1:1 Lesson",
      description: null,
      priceCents: 5000,
      priceCurrency: "cad",
      requiresSubscription: false,
      isScheduled: false,
      ...overrides,
   };
}

beforeEach(() => {
   jest.clearAllMocks();
   startPrivateLessonCheckout.mockReturnValue(new Promise(() => {}));
   checkoutServiceBooking.mockReturnValue(new Promise(() => {}));
});

describe("CheckoutFlow", () => {
   it("goes straight from review to payment for a non-scheduled lesson", async () => {
      render(
         <CheckoutFlow
            service={service({ isScheduled: false })}
            discount={null}
         />,
      );

      expect(screen.queryByText("Availability")).not.toBeInTheDocument();

      fireEvent.click(
         screen.getByRole("button", { name: "Continue to payment" }),
      );

      await waitFor(() =>
         expect(startPrivateLessonCheckout).toHaveBeenCalledWith({
            serviceId: "22222222-2222-2222-2222-222222222222",
         }),
      );
      expect(
         screen.queryByTestId("availability-calendar"),
      ).not.toBeInTheDocument();
   });

   it("shows the calendar step for a scheduled lesson", () => {
      render(
         <CheckoutFlow
            service={service({ isScheduled: true })}
            discount={null}
         />,
      );

      expect(screen.getByText("Availability")).toBeInTheDocument();

      fireEvent.click(
         screen.getByRole("button", { name: "Continue to payment" }),
      );

      expect(screen.getByText("Pick your availabilities")).toBeInTheDocument();
      expect(screen.getByTestId("availability-calendar")).toBeInTheDocument();
      expect(startPrivateLessonCheckout).not.toHaveBeenCalled();
   });

   it("keeps programs going straight to payment", async () => {
      render(
         <CheckoutFlow
            service={service({ type: "programs", coordinatorId: null })}
            discount={null}
         />,
      );

      fireEvent.click(
         screen.getByRole("button", { name: "Continue to payment" }),
      );

      await waitFor(() =>
         expect(checkoutServiceBooking).toHaveBeenCalledWith({
            serviceId: "22222222-2222-2222-2222-222222222222",
         }),
      );
      expect(startPrivateLessonCheckout).not.toHaveBeenCalled();
   });
});
