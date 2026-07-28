import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
        {children}
      </main>
      <Footer />
    </>
  );
}
