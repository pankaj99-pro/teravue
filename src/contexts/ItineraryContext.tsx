import { createContext, useContext, useState, ReactNode } from "react";

export interface ItineraryStop {
  id: number;
  time: string;
  title: string;
  location: string;
  price?: string;
  priceLabel?: string;
  buttonLabel: string;
  image: string;
  lat?: number;
  lng?: number;
}

export interface DayPlan {
  day: number;
  date: string;
  title: string;
  stops: ItineraryStop[];
}

export interface TripPlan {
  destination: string;
  country: string;
  countryFlag: string;
  totalDays: number;
  dateRange: string;
  travelers: string;
  avgBudget: string;
  days: DayPlan[];
}

interface ItineraryContextType {
  tripPlan: TripPlan | null;
  setTripPlan: (plan: TripPlan) => void;
  isAiGenerated: boolean;
}

const ItineraryContext = createContext<ItineraryContextType | undefined>(undefined);

export function ItineraryProvider({ children }: { children: ReactNode }) {
  const [tripPlan, setTripPlanState] = useState<TripPlan | null>(null);

  const setTripPlan = (plan: TripPlan) => {
    setTripPlanState(plan);
  };

  return (
    <ItineraryContext.Provider value={{ tripPlan, setTripPlan, isAiGenerated: tripPlan !== null }}>
      {children}
    </ItineraryContext.Provider>
  );
}

export function useItinerary() {
  const context = useContext(ItineraryContext);
  if (!context) throw new Error("useItinerary must be used within ItineraryProvider");
  return context;
}
