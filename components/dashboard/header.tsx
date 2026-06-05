import { signout } from "@/app/login/actions";
import { Button } from "@/components/ui/button";

type DashboardHeaderProps = {
   displayName: string;
};

export function DashboardHeader({ displayName }: DashboardHeaderProps) {
   return (
      <header className="flex items-center justify-end gap-4 border-b border-[#d4e4ed] bg-white px-6 py-4">
         <div className="rounded bg-[#f4d03f] px-4 py-2 text-sm font-bold tracking-wide text-[#1a3d52] uppercase">
            {displayName}
         </div>
         <form>
            <Button
               type="submit"
               formAction={signout}
               variant="ghost"
               className="text-sm font-semibold tracking-wide text-[#1a3d52] uppercase hover:bg-transparent hover:underline"
            >
               Logout
            </Button>
         </form>
      </header>
   );
}
