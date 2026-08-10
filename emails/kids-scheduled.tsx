import { CoordinatorBookingEmail } from "../lib/email/coordinator-booking";

export default function KidsScheduled() {
   return (
      <CoordinatorBookingEmail
         coordinatorName="Jordan Lee"
         serviceTitle="Kids Learn-to-Skate (Private)"
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
            start: "2026-06-23T14:30:00.000Z",
            end: "2026-06-23T15:15:00.000Z",
         }}
         child={{
            firstName: "Maya",
            lastName: "Thompson",
            dob: "2016-04-12",
            gender: "female",
            allergies: "Peanuts, shellfish",
            medicalConditions: "Mild asthma",
            medications: "Ventolin inhaler as needed",
            emergencyContacts: [
               {
                  fullName: "Sarah Thompson",
                  relationship: "Mother",
                  phoneNumber: "+1 514-555-0142",
                  emailAddress: "sarah.thompson@example.com",
               },
               {
                  fullName: "David Thompson",
                  relationship: "Father",
                  phoneNumber: "+1 514-555-0188",
                  emailAddress: "david.thompson@example.com",
               },
            ],
            formAnswers: [
               {
                  prompt: "Has your child taken lessons before?",
                  answer: ["Yes — one season of group lessons"],
               },
               {
                  prompt: "Select any equipment you need to rent",
                  answer: ["Helmet", "Skates (size 3)"],
               },
               {
                  prompt: "I agree to the waiver and code of conduct",
                  answer: ["Agreed"],
               },
            ],
         }}
      />
   );
}
