import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ascend — Learn by doing in an AI company simulator",
  description: "Build a company, practice real work with five AI coworkers, and improve through feedback.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
