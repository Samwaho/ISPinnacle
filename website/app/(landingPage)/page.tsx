import { Contact } from "./_components/Contact";
import { Features } from "./_components/Features";
import { Footer } from "./_components/Footer";
import { Hero } from "./_components/Hero";
import { Testimonials } from "./_components/Testimonials";
import Header from "@/components/Header";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-50 w-full">
        <div className="w-full bg-background/30 backdrop-blur-md border-b border-border/50 shadow-sm">
          <Header />
        </div>
      </div>
      
      <Hero />
      <Features />
      <Testimonials />
      <Contact />
      <Footer />
    </div>
  );
}
