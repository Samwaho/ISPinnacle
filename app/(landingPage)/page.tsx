import { Contact } from "./_components/Contact";
import { Features } from "./_components/Features";
import { Footer } from "./_components/Footer";
import { Hero } from "./_components/Hero";
import { Testimonials } from "./_components/Testimonials";


export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Hero />
      <Features />
      <Testimonials />
      <Contact />
      <Footer />
    </div>
  );
}
