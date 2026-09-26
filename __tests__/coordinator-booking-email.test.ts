/**
 * @jest-environment node
 */
import { renderToStaticMarkup } from "react-dom/server";
import {
   CoordinatorBookingEmail,
   type CoordinatorBookingEmailProps,
} from "@/lib/email/coordinator-booking";

const client = {
   firstName: "Ada",
   lastName: "Lovelace",
   email: "ada@example.com",
   address: null,
   gender: null,
   dob: null,
   phone: null,
   hasActiveSubscription: true,
};

function render(props: CoordinatorBookingEmailProps): string {
   return renderToStaticMarkup(CoordinatorBookingEmail(props));
}

describe("CoordinatorBookingEmail", () => {
   it("asks the coordinator to arrange a time when the lesson is not scheduled", () => {
      const text = render({
         coordinatorName: "Grace Hopper",
         serviceTitle: "1:1 Lesson",
         client,
         scheduledSlot: null,
         requestedAvailability: [],
         timeZone: "UTC",
      });

      expect(text).toContain("No time scheduled yet.");
      expect(text).toContain(
         "Please contact Ada Lovelace to arrange a time for the lesson.",
      );
      expect(text).not.toContain("requested availability");
   });

   it("lists the requested availability instead when the client picked windows", () => {
      const text = render({
         coordinatorName: "Grace Hopper",
         serviceTitle: "1:1 Lesson",
         client,
         scheduledSlot: null,
         requestedAvailability: [
            { start: "2026-10-01T14:00:00Z", end: "2026-10-01T15:00:00Z" },
         ],
         timeZone: "UTC",
      });

      expect(text).toContain("No time scheduled yet.");
      expect(text).toContain("requested availability");
      expect(text).not.toContain("Please contact");
   });
});
