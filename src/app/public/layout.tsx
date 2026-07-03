import { Navbar } from "@/components/ui/public/navbar";
import { Footer } from "@/components/ui/public/footer";

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <div id="top" />
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
