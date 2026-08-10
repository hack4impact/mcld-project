import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
} from "@/components/ui/table";
import { getCurrentUser } from "@/lib/auth/current-user";
import { formatDate, formatDateFromInstant } from "@/lib/format";
import { StatusBadge } from "../_components/status-badge";
import { listBookingsForUser, type AccountBooking } from "./queries";

export default function BookingsPage() {
   return (
      <Suspense fallback={<Spinner className="size-8 text-muted-foreground" />}>
         <BookingsContent />
      </Suspense>
   );
}

function whenLabel(booking: AccountBooking): string {
   if (booking.scheduledAt) return formatDateFromInstant(booking.scheduledAt);
   if (booking.startDate && booking.endDate) {
      return `${formatDate(booking.startDate)} – ${formatDate(booking.endDate)}`;
   }
   if (booking.startDate) return formatDate(booking.startDate);
   return "To be scheduled";
}

async function BookingsContent() {
   const user = await getCurrentUser();
   if (!user) redirect("/login");

   const bookings = await listBookingsForUser(user.id);

   return (
      <main className="flex flex-col gap-6 p-8">
         <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold">Bookings</h1>
            <p className="text-sm text-muted-foreground">
               Programs and private lessons booked on your account.
            </p>
         </div>

         {bookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">
               You have no bookings yet.
            </p>
         ) : (
            <div className="overflow-hidden rounded-lg border border-border">
               <Table>
                  <TableHeader className="bg-primary/30">
                     <TableRow>
                        <TableHead>Service</TableHead>
                        <TableHead>Attendee</TableHead>
                        <TableHead>When</TableHead>
                        <TableHead>Booked</TableHead>
                        <TableHead>Status</TableHead>
                     </TableRow>
                  </TableHeader>
                  <TableBody>
                     {bookings.map((booking) => (
                        <TableRow key={`${booking.kind}-${booking.id}`}>
                           <TableCell className="font-medium">
                              {booking.title}
                              {booking.kind === "private_lesson" && (
                                 <span className="ml-2 text-xs text-muted-foreground">
                                    private lesson
                                 </span>
                              )}
                           </TableCell>
                           <TableCell>{booking.attendee ?? "You"}</TableCell>
                           <TableCell>{whenLabel(booking)}</TableCell>
                           <TableCell>
                              {formatDateFromInstant(booking.bookedAt)}
                           </TableCell>
                           <TableCell>
                              <StatusBadge status={booking.status} />
                           </TableCell>
                        </TableRow>
                     ))}
                  </TableBody>
               </Table>
            </div>
         )}
      </main>
   );
}
