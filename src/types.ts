export interface Match {
  id: string;
  stadiumName: string;
  matchName: string;
  matchDate: string;
  matchTime: string;
  ticketPrice: number;
  published: boolean;
  image?: string;
}

export type VolunteerStatus = 'active' | 'inactive';

export interface Volunteer {
  id: string;
  name: string;
  volunteerId: string; // e.g. VOL-4821
  status: VolunteerStatus;
}

export type TaskType = 'Deliver Food' | 'Medical Emergency' | 'Complaint Resolution' | 'Seat Issue' | 'Facility Issue';
export type TaskPriority = 'High' | 'Medium' | 'Low';
export type TaskStatus = 'pending' | 'accepted' | 'completed';

export interface Task {
  id: string;
  type: TaskType;
  details: string;
  seatNumber: string;
  priority: TaskPriority;
  status: TaskStatus;
  assignedTo?: string; // Volunteer ID
  timestamp: string;
  linkedId?: string; // References the originating foodOrder / emergencyRequest / issueReport
}

export interface FoodItem {
  id: string;
  name: string;
  price: number;
  category: string;
  image?: string;
}

export type OrderStatus = 'pending' | 'preparing' | 'delivered';
export type EmergencyStatus = 'active' | 'resolved';
export type IssueStatus = 'open' | 'resolved';

export interface FoodOrder {
  id: string;
  items: { name: string; quantity: number; price: number }[];
  seatNumber: string;
  totalPrice: number;
  status: OrderStatus;
  timestamp: string;
}

export interface MedicalEmergency {
  id: string;
  seatNumber: string;
  status: EmergencyStatus;
  timestamp: string;
}

export interface IssueReport {
  id: string;
  category: 'Seat Occupancy' | 'Harassment' | 'Broken Seat' | 'Dirty Washroom' | 'Other';
  seatNumber: string;
  description: string;
  status: IssueStatus;
  timestamp: string;
}

export interface SystemConfig {
  n8nWebhookUrl: string;
  useMockAI: boolean;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

/** Real-time alert shown in the Organizer dashboard alerts panel. */
export interface StadiumAlert {
  id: string;
  /** 'Emergency' for medical/safety beacons; any other string for operational issues. */
  type: string;
  message: string;
  timestamp: string;
}

/** A single line-item in a food order. */
export interface OrderedItem {
  name: string;
  quantity: number;
  price: number;
}
