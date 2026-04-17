import Link from "next/link";

export default function CheckoutCancelPage() {
   return (
      <div className="flex min-h-screen items-center justify-center px-4">
         <div className="w-full max-w-md text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
               <svg
                  className="h-8 w-8 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
               >
                  <path
                     strokeLinecap="round"
                     strokeLinejoin="round"
                     d="M6 18L18 6M6 6l12 12"
                  />
               </svg>
            </div>
            <h1 className="mb-2 text-2xl font-bold">Payment Cancelled</h1>
            <p className="mb-8 text-gray-600">
               Your payment was not processed. You have not been charged.
            </p>
            <Link
               href="/"
               className="inline-block rounded-lg bg-black px-6 py-3 text-sm font-medium text-white hover:bg-gray-800"
            >
               Go Back
            </Link>
         </div>
      </div>
   );
}
