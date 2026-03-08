import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { TripHeader } from "@/components/TripHeader";
import { ItineraryCard, ItineraryItem } from "@/components/ItineraryCard";
import { MapPanel } from "@/components/MapPanel";

import airportImg from "@/assets/airport.jpg";
import hotelImg from "@/assets/hotel.jpg";
import restaurantImg from "@/assets/restaurant.jpg";
import colosseumImg from "@/assets/colosseum.jpg";

const itineraryItems: ItineraryItem[] = [
  {
    id: 1,
    time: "10:30 AM",
    title: "Fiumicino Airport (Arrival)",
    location: "Leonardo da Vinci Intl. Airport",
    priceLabel: "Included in Flight Ticket",
    buttonLabel: "Book a Flight",
    image: airportImg,
  },
  {
    id: 2,
    time: "12:00 PM",
    title: "Albergo Roma (Hotel Check-in)",
    location: "City Center, Rome",
    price: "$130.00",
    priceLabel: "per night",
    buttonLabel: "View Booking",
    image: hotelImg,
  },
  {
    id: 3,
    time: "1:00 PM",
    title: "Trattoria da Enzo al 29 (Lunch)",
    location: "Trastevere, Rome",
    price: "$27.00",
    priceLabel: "per person",
    buttonLabel: "Reserve Table",
    image: restaurantImg,
  },
  {
    id: 4,
    time: "3:00 PM",
    title: "Colosseum & Roman Forum",
    location: "Piazza del Colosseo, Rome",
    price: "$20.00",
    priceLabel: "per ticket",
    buttonLabel: "Book Ticket",
    image: colosseumImg,
  },
];

export default function Index() {
  const [selectedDay, setSelectedDay] = useState(1);
  const [activeStop, setActiveStop] = useState(1);
  const [viewMode, setViewMode] = useState<"itinerary" | "map">("itinerary");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Mobile tabs */}
      <div className="md:hidden fixed top-16 left-0 right-0 z-40 glass-navbar flex">
        {(["itinerary", "map"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`flex-1 py-3 text-sm font-medium capitalize transition-colors ${
              viewMode === mode
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground"
            }`}
          >
            {mode}
          </button>
        ))}
      </div>

      {/* Main content */}
      <div className="pt-16 md:pt-16 flex flex-col md:flex-row h-[calc(100vh-4rem)]">
        {/* Left: Itinerary */}
        <div
          className={`w-full md:w-[42%] lg:w-[38%] border-r border-border overflow-y-auto ${
            viewMode === "map" ? "hidden md:block" : ""
          }`}
          style={{ marginTop: viewMode === "itinerary" ? "2.75rem" : 0 }}
        >
          <div className="md:mt-0" style={{ marginTop: 0 }}>
            <TripHeader selectedDay={selectedDay} onDayChange={setSelectedDay} />

            <div className="px-6 pb-8 space-y-1">
              {itineraryItems.map((item) => (
                <ItineraryCard
                  key={item.id}
                  item={item}
                  isActive={activeStop === item.id}
                  onClick={() => setActiveStop(item.id)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right: Map */}
        <div
          className={`flex-1 ${
            viewMode === "itinerary" ? "hidden md:block" : ""
          }`}
          style={{ marginTop: viewMode === "map" ? "2.75rem" : 0 }}
        >
          <MapPanel activeStop={activeStop} />
        </div>
      </div>
    </div>
  );
}
