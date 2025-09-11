export interface Professor {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

export type PersonType = "professor" | "student";

export interface Availability {
  id: string;
  person_id: string;
  person_type: PersonType;
  day_of_week: string; // 'monday' | 'tuesday' | ...
  start_time: string; // HH:MM:SS
  end_time: string;   // HH:MM:SS
  created_at: string;
}

export interface UpsertPersonInput {
  id?: string;
  name: string;
  email: string;
  initialAvailability?: Array<{
    day_of_week: string;
    start_time: string; // HH:MM (we will append :00)
    end_time: string;   // HH:MM
  }>;
}

export interface UpsertAvailabilityInput {
  id?: string;
  person_id: string;
  person_type: PersonType;
  day_of_week: string;
  start_time: string;
  end_time: string;
}


