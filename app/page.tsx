import Navigation from "./components/Navigation";
import Hero from "./components/Hero";
import Features from "./components/Features";
import About from "./components/About";
import LegacyList from "./components/LegacyList";
import Footer from "./components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen">
      <Navigation />
      <Hero />
      <About />
      <Features />
      <LegacyList />
      <Footer />
    </div>
  );
}
