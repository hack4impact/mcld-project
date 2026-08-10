import { CoordinatorBookingEmail } from "../lib/email/coordinator-booking";

export default function KidsMinimalEmptyStates() {
   return (
      <CoordinatorBookingEmail
         coordinatorName="Jordan Lee"
         serviceTitle="Kids Learn-to-Skate (Private)"
         client={{
            firstName: "Sam",
            lastName: "Nguyen",
            email: "sam.nguyen@example.com",
            address: null,
            gender: null,
            dob: null,
            phone: null,
            hasActiveSubscription: false,
         }}
         scheduledSlot={null}
         child={{
            firstName: "Theo",
            lastName: "Nguyen",
            dob: "2018-11-03",
            gender: "male",
            allergies: null,
            medicalConditions: null,
            medications: null,
            emergencyContacts: [],
            formAnswers: [],
         }}
      />
   );
}
