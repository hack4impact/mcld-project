import { CoordinatorBookingEmail } from "../lib/email/coordinator-booking";

export default function AdultScheduledSubscribed() {
   return (
      <CoordinatorBookingEmail
         coordinatorName="Jordan Lee"
         serviceTitle="1:1 Skating Lesson"
         client={{
            firstName: "Alex",
            lastName: "Rivera",
            email: "alex.rivera@example.com",
            address: "1240 Rue Sainte-Catherine, Montréal, QC H3B 1A7",
            gender: "prefer_not_to_say",
            dob: "1992-09-30",
            phone: "+1 438-555-0110",
            hasActiveSubscription: true,
         }}
         scheduledSlot={{
            start: "2026-06-22T18:00:00.000Z",
            end: "2026-06-22T19:00:00.000Z",
         }}
      />
   );
}
