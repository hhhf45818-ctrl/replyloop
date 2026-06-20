import { redirect } from "next/navigation";

// Root route → always send users to the login page.
export default function RootPage() {
  redirect("/login");
}
