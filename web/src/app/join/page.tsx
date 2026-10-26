import { AppNavigation } from "@/components/company/app-navigation";
import { JoinCompanyForm } from "@/components/company/join-company-form";

export default function JoinPage() {
  return <main className="company-create-page"><AppNavigation location="join" /><div className="mx-auto max-w-2xl px-5 py-12 sm:py-20"><JoinCompanyForm /></div></main>;
}
