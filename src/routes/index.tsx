import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Hero } from "@/components/site/Hero";
import { About } from "@/components/site/About";
import { Services } from "@/components/site/Services";
import { VipBanner } from "@/components/site/VipBanner";
import { Team } from "@/components/site/Team";
import { Gallery } from "@/components/site/Gallery";
import { Reviews } from "@/components/site/Reviews";
import { Contact } from "@/components/site/Contact";
import { BookingBanner } from "@/components/site/BookingBanner";
import { Footer } from "@/components/site/Footer";
import { getPublicCatalogState } from "@/lib/booking-api";

export const Route = createFileRoute("/")({
  loader: () => getPublicCatalogState(),
  component: Index,
});

function Index() {
  const catalog = Route.useLoaderData();

  return (
    <main className="bg-navy text-bone min-h-screen">
      <Navbar />
      <Hero />
      <About />
      <Services services={catalog.services} />
      <VipBanner />
      <Team barbers={catalog.barbers.filter((barber) => !barber.isAnyOption)} />
      <Gallery />
      <Reviews />
      <Contact settings={catalog.settings} />
      <BookingBanner settings={catalog.settings} />
      <Footer settings={catalog.settings} />
    </main>
  );
}
