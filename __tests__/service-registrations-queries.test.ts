/**
 * @jest-environment node
 */
import { getServiceRegistrations } from "@/app/(authenticated)/services/[id]/queries";

const query = jest.fn();

jest.mock("@/lib/db", () => {
   const { drizzle } = jest.requireActual("drizzle-orm/pg-proxy");
   return {
      db: drizzle((...args: unknown[]) => query(...args)),
   };
});

jest.mock("next/cache", () => ({ cacheTag: jest.fn() }));

const serviceId = "service-1";
const registeredAt = "2026-09-26 14:00:00";

beforeEach(() => {
   query.mockReset();
});

describe("getServiceRegistrations", () => {
   it.each([
      ["private_lessons", "coaching_sessions"],
      ["programs", "service_bookings"],
   ])("shows adult registrations for %s", async (type, table) => {
      query
         .mockResolvedValueOnce({ rows: [[type, false, null]] })
         .mockResolvedValueOnce({
            rows: [
               [
                  "booking-1",
                  "confirmed",
                  registeredAt,
                  "user-1",
                  "Ada",
                  "Lovelace",
                  "ada@example.com",
               ],
            ],
         });

      const result = await getServiceRegistrations(serviceId);

      expect(query.mock.calls[1][0]).toContain(`from "${table}"`);
      expect(query.mock.calls[1][1]).toEqual([serviceId]);
      expect(result).toEqual({
         kind: "adult",
         registrations: [
            {
               bookingId: "booking-1",
               status: "confirmed",
               registeredAt: new Date(`${registeredAt}Z`),
               profile: {
                  id: "user-1",
                  firstName: "Ada",
                  lastName: "Lovelace",
                  email: "ada@example.com",
               },
            },
         ],
      });
   });

   it.each([
      ["private_lessons", "coaching_sessions"],
      ["programs", "service_bookings"],
   ])(
      "retains child, contact, and form details for %s",
      async (type, table) => {
         query
            .mockResolvedValueOnce({ rows: [[type, true, "form-1"]] })
            .mockResolvedValueOnce({
               rows: [
                  [
                     "booking-1",
                     "confirmed",
                     registeredAt,
                     "child-1",
                     "Sam",
                     "Lovelace",
                     "2018-05-01",
                     "prefer_not_to_say",
                     "Peanuts",
                     null,
                     null,
                     "Ada",
                     "Lovelace",
                     "ada@example.com",
                  ],
               ],
            })
            .mockResolvedValueOnce({
               rows: [
                  [
                     "child-1",
                     "Alex Lovelace",
                     "alex@example.com",
                     "+15145550100",
                     "Parent",
                  ],
               ],
            })
            .mockResolvedValueOnce({
               rows: [["child-1", "Experience level?", ["Beginner"]]],
            });

         const result = await getServiceRegistrations(serviceId);

         expect(query.mock.calls[1][0]).toContain(`from "${table}"`);
         expect(query.mock.calls[1][1]).toEqual([serviceId]);
         expect(result).toEqual({
            kind: "kid",
            registrations: [
               {
                  bookingId: "booking-1",
                  status: "confirmed",
                  registeredAt: new Date(`${registeredAt}Z`),
                  child: {
                     id: "child-1",
                     firstName: "Sam",
                     lastName: "Lovelace",
                     dob: "2018-05-01",
                     gender: "prefer_not_to_say",
                     allergies: "Peanuts",
                     medicalConditions: null,
                     medications: null,
                     emergencyContacts: [
                        {
                           childId: "child-1",
                           fullName: "Alex Lovelace",
                           emailAddress: "alex@example.com",
                           phoneNumber: "+15145550100",
                           relationship: "Parent",
                        },
                     ],
                  },
                  parent: {
                     firstName: "Ada",
                     lastName: "Lovelace",
                     email: "ada@example.com",
                  },
                  formAnswers: [
                     { prompt: "Experience level?", answer: ["Beginner"] },
                  ],
               },
            ],
         });
      },
   );
});
