import {
   Body,
   Container,
   Head,
   Heading,
   Hr,
   Html,
   Img,
   Preview,
   Section,
   Text,
} from "@react-email/components";

const LOGO_URL = "https://upload.storylife.fr/i/01KT1V0H9B80F2GP3WE2BG3SAN.png";

export type EmergencyContactInfo = {
   fullName: string;
   relationship: string;
   phoneNumber: string;
   emailAddress: string;
};

export type ChildFormAnswer = { prompt: string; answer: string[] };

export type ChildInfo = {
   firstName: string;
   lastName: string;
   dob: string | null;
   gender: string | null;
   allergies: string | null;
   medicalConditions: string | null;
   medications: string | null;
   emergencyContacts: EmergencyContactInfo[];
   formAnswers: ChildFormAnswer[];
};

export type TimeSlot = { start: string; end: string };

export type CoordinatorBookingEmailProps = {
   coordinatorName: string;
   serviceTitle: string;
   client: {
      firstName: string;
      lastName: string;
      email: string;
      address: string | null;
      gender: string | null;
      dob: string | null;
      phone: string | null;
      hasActiveSubscription: boolean;
   };
   scheduledSlot?: TimeSlot | null;
   requestedAvailability?: TimeSlot[];
   notes?: string | null;
   child?: ChildInfo | null;
   timeZone?: string;
};

function formatSlot(slot: TimeSlot, timeZone?: string): string {
   const start = new Date(slot.start);
   const end = new Date(slot.end);
   const day = start.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone,
   });
   const time = (d: Date) =>
      d.toLocaleTimeString("en-US", {
         hour: "numeric",
         minute: "2-digit",
         timeZone,
      });
   return `${day}, ${time(start)} – ${time(end)}`;
}

function formatGender(gender: string | null | undefined): string | null {
   if (!gender) return null;
   const labels: Record<string, string> = {
      male: "Male",
      female: "Female",
      prefer_not_to_say: "Prefer not to say",
   };
   return labels[gender] ?? gender;
}

type Detail = [string, string | null | undefined];

function DetailRows({ rows }: { rows: Detail[] }) {
   const present = rows.filter(([, v]) => v != null && String(v).trim() !== "");
   return (
      <Section style={detailTable}>
         {present.map(([label, value]) => (
            <Text key={label} style={detailRow}>
               <span style={detailLabel}>{label}:</span> {String(value)}
            </Text>
         ))}
      </Section>
   );
}

function SectionHeading({ children }: { children: string }) {
   return (
      <Heading as="h2" style={h2}>
         {children}
      </Heading>
   );
}

export function CoordinatorBookingEmail({
   coordinatorName,
   serviceTitle,
   client,
   scheduledSlot,
   requestedAvailability,
   notes,
   child,
   timeZone,
}: CoordinatorBookingEmailProps) {
   const clientName = `${client.firstName} ${client.lastName}`.trim();
   const childName = child ? `${child.firstName} ${child.lastName}`.trim() : "";

   return (
      <Html lang="en">
         <Head />
         <Preview>{`${clientName} booked ${serviceTitle}`}</Preview>
         <Body style={body}>
            <Container style={container}>
               <Img src={LOGO_URL} alt="MCLD" width={120} style={logo} />
               <Heading as="h1" style={h1}>
                  New private lesson booking
               </Heading>

               <Text style={paragraph}>Hi {coordinatorName},</Text>
               <Text style={paragraph}>
                  <strong>{clientName}</strong> booked and paid for{" "}
                  <strong>{serviceTitle}</strong>.
               </Text>

               <SectionHeading>Time</SectionHeading>
               {scheduledSlot ? (
                  <Text style={slotText}>
                     {formatSlot(scheduledSlot, timeZone)}
                  </Text>
               ) : (
                  <>
                     <Text style={muted}>No time scheduled yet.</Text>
                     {requestedAvailability &&
                        requestedAvailability.length > 0 && (
                           <>
                              <Text style={paragraph}>
                                 Client&apos;s requested availability:
                              </Text>
                              {requestedAvailability.map((s) => (
                                 <Text key={s.start} style={listItem}>
                                    • {formatSlot(s, timeZone)}
                                 </Text>
                              ))}
                           </>
                        )}
                  </>
               )}

               <SectionHeading>Client</SectionHeading>
               <DetailRows
                  rows={[
                     ["Name", clientName],
                     ["Email", client.email],
                     ["Phone", client.phone],
                     ["Address", client.address],
                     ["Gender", formatGender(client.gender)],
                     ["Date of birth", client.dob],
                     [
                        "Active subscription",
                        client.hasActiveSubscription ? "Yes" : "No",
                     ],
                  ]}
               />

               {notes && (
                  <>
                     <SectionHeading>Notes from the client</SectionHeading>
                     <Text style={notesText}>{notes}</Text>
                  </>
               )}

               {child && (
                  <>
                     <SectionHeading>Registered child</SectionHeading>
                     <DetailRows
                        rows={[
                           ["Name", childName],
                           ["Date of birth", child.dob],
                           ["Gender", formatGender(child.gender)],
                           ["Allergies", child.allergies],
                           ["Medical conditions", child.medicalConditions],
                           ["Medications", child.medications],
                        ]}
                     />

                     <SectionHeading>Emergency contacts</SectionHeading>
                     {child.emergencyContacts.length > 0 ? (
                        child.emergencyContacts.map((c, i) => (
                           <Section
                              key={`${c.fullName}-${i}`}
                              style={i > 0 ? contactSpacer : undefined}
                           >
                              <DetailRows
                                 rows={[
                                    ["Name", c.fullName],
                                    ["Relationship", c.relationship],
                                    ["Phone", c.phoneNumber],
                                    ["Email", c.emailAddress],
                                 ]}
                              />
                           </Section>
                        ))
                     ) : (
                        <Text style={muted}>None on file.</Text>
                     )}

                     <SectionHeading>Form answers</SectionHeading>
                     {child.formAnswers.length > 0 ? (
                        child.formAnswers.map((a, i) => (
                           <Text key={`${a.prompt}-${i}`} style={answerItem}>
                              <strong>{a.prompt}</strong>
                              <br />
                              {a.answer.join(", ") || "—"}
                           </Text>
                        ))
                     ) : (
                        <Text style={muted}>No answers submitted.</Text>
                     )}
                  </>
               )}

               <Hr style={footerRule} />
               <Text style={footer}>
                  This is an automated booking notification — no reply is
                  needed.
               </Text>
            </Container>
         </Body>
      </Html>
   );
}

const body: React.CSSProperties = {
   backgroundColor: "#f3f3f3",
   fontFamily:
      "system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif",
   color: "#111111",
   lineHeight: 1.5,
};

const container: React.CSSProperties = {
   maxWidth: "560px",
   margin: "0 auto",
   padding: "24px",
   backgroundColor: "#ffffff",
};

const logo: React.CSSProperties = {
   display: "block",
   margin: "0 auto 20px",
   height: "auto",
};

const h1: React.CSSProperties = {
   fontSize: "20px",
   margin: "0 0 16px",
};

const h2: React.CSSProperties = {
   fontSize: "15px",
   margin: "24px 0 8px",
   borderTop: "1px solid #eeeeee",
   paddingTop: "16px",
};

const paragraph: React.CSSProperties = { fontSize: "14px", margin: "8px 0" };

const muted: React.CSSProperties = {
   fontSize: "14px",
   margin: "8px 0",
   color: "#666666",
};

const slotText: React.CSSProperties = {
   fontSize: "15px",
   fontWeight: 600,
   margin: "8px 0",
};

const listItem: React.CSSProperties = { fontSize: "14px", margin: "2px 0" };

const notesText: React.CSSProperties = {
   fontSize: "14px",
   margin: "8px 0",
   whiteSpace: "pre-wrap",
};

const answerItem: React.CSSProperties = { fontSize: "14px", margin: "6px 0" };

const detailTable: React.CSSProperties = { margin: "8px 0" };

const detailRow: React.CSSProperties = { fontSize: "14px", margin: "3px 0" };

const detailLabel: React.CSSProperties = {
   color: "#666666",
   fontWeight: 600,
};

const contactSpacer: React.CSSProperties = { marginTop: "8px" };

const footerRule: React.CSSProperties = {
   borderColor: "#eeeeee",
   margin: "24px 0 0",
};

const footer: React.CSSProperties = {
   marginTop: "12px",
   fontSize: "12px",
   color: "#888888",
};
