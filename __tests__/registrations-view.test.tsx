import "@testing-library/jest-dom";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { RegistrationsView } from "@/app/(authenticated)/registrations/_components/registrations-view";
import { buildRegistrations } from "@/app/(authenticated)/registrations/build-registrations";
import { NOW, bookings, sessions, titles } from "./fixtures/registrations";

function renderFixtures() {
   const { upcoming, past } = buildRegistrations({
      bookings,
      sessions,
      titles,
      now: NOW,
   });
   return render(<RegistrationsView upcoming={upcoming} past={past} />);
}

function cardFor(text: string | RegExp) {
   const card = screen.getByText(text).closest('[data-slot="card"]');
   if (!(card instanceof HTMLElement)) throw new Error(`No card for ${text}`);
   return within(card);
}

function pastSection() {
   return within(screen.getByRole("region", { name: /past/i }));
}

describe("RegistrationsView", () => {
   it("counts only upcoming registrations in the filter tabs", () => {
      renderFixtures();

      expect(screen.getByRole("tab", { name: "All (4)" })).toBeInTheDocument();
      expect(
         screen.getByRole("tab", { name: "Programs (1)" }),
      ).toBeInTheDocument();
      expect(
         screen.getByRole("tab", { name: "Private lessons (3)" }),
      ).toBeInTheDocument();
      expect(
         screen.getByRole("heading", { name: "Past (3)" }),
      ).toBeInTheDocument();
   });

   it("shows each upcoming Renaud lesson as its own card", () => {
      renderFixtures();
      const tabPanel = within(screen.getByRole("tabpanel"));

      expect(tabPanel.getAllByText("Renaud coaching")).toHaveLength(3);
      expect(
         tabPanel.getByText(/^Lesson 2 · Sat, Oct 3, 2026, 10:00\sAM$/),
      ).toBeInTheDocument();
      expect(
         tabPanel.getByText(/^Lesson 3 · Sat, Oct 10, 2026, 10:00\sAM$/),
      ).toBeInTheDocument();

      const unscheduled = cardFor(
         "Lesson 4 · Time to be confirmed by your coach",
      );
      expect(
         unscheduled.getByText("Awaiting coach confirmation"),
      ).toBeInTheDocument();
      expect(
         unscheduled.getByText(/^Booked Sep 24, 2026, 8:00\sAM$/),
      ).toBeInTheDocument();
      expect(unscheduled.getByText("Léa Martin")).toBeInTheDocument();
   });

   it("gives programs and private lessons different badge colours", () => {
      renderFixtures();

      expect(
         cardFor("Fall hockey program").getByText("Program"),
      ).toHaveAttribute("data-variant", "default");
      expect(
         cardFor(/^Lesson 2 · /).getByText("Private lesson"),
      ).toHaveAttribute("data-variant", "secondary");
   });

   it("labels upcoming and past cards", () => {
      renderFixtures();

      expect(
         cardFor("Fall hockey program").getByText("Upcoming"),
      ).toBeInTheDocument();
      expect(cardFor("Summer camp").getByText("Past")).toBeInTheDocument();
      expect(pastSection().queryByText("Upcoming")).not.toBeInTheDocument();
   });

   it("lists everyone registered for a program", () => {
      renderFixtures();
      const fall = cardFor("Fall hockey program");

      expect(fall.getByText("You")).toBeInTheDocument();
      expect(fall.getByText("Léa Martin")).toBeInTheDocument();
      expect(fall.getByText("Monday 17:00")).toBeInTheDocument();
   });

   it("hides archived services", () => {
      renderFixtures();

      expect(screen.queryByText("Winter clinic")).not.toBeInTheDocument();
      expect(screen.queryByText("Archived")).not.toBeInTheDocument();
   });

   it("flags unavailable services and falls back on a missing title", () => {
      renderFixtures();

      const unavailable = pastSection().getByText("Unavailable");
      expect(unavailable).toHaveAttribute("data-variant", "destructive");

      const card = within(
         unavailable.closest('[data-slot="card"]') as HTMLElement,
      );
      expect(card.getAllByText("Private lesson")).toHaveLength(2);
   });

   it("filters upcoming by type but always shows past", () => {
      renderFixtures();

      fireEvent.mouseDown(screen.getByRole("tab", { name: "Programs (1)" }));

      const tabPanel = within(screen.getByRole("tabpanel"));
      expect(tabPanel.queryByText("Renaud coaching")).not.toBeInTheDocument();
      expect(tabPanel.getByText("Fall hockey program")).toBeInTheDocument();

      expect(pastSection().getByText("Renaud coaching")).toBeInTheDocument();
      expect(pastSection().getByText("Summer camp")).toBeInTheDocument();
   });

   it("shows the empty state with no registrations", () => {
      render(<RegistrationsView upcoming={[]} past={[]} />);
      expect(screen.getByText("No registrations yet")).toBeInTheDocument();
   });
});
