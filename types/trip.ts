export interface Trip {
  id: string;
  date: Date;
  origin: string;
  destination: string;
  transportType: string;
  cost: number;
  distance: number;
  description: string;
}
