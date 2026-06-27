export const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
   confirmed: "default",
   pending: "secondary",
   awaiting_payment: "outline",
   cancelled: "destructive",
};

export const GENDER_LABELS: Record<string, string> = {
   male: "Male",
   female: "Female",
   prefer_not_to_say: "Prefer not to say",
};
