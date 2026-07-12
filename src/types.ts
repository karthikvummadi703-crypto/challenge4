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

export interface Volunteer {
  id: string;
  name: string;
  volunteerId: string; // e.g. VOL-4821
  status: 'active' | 'inactive';
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

export interface FoodOrder {
  id: string;
  items: { name: string; quantity: number; price: number }[];
  seatNumber: string;
  totalPrice: number;
  status: 'pending' | 'preparing' | 'delivered';
  timestamp: string;
}

export interface MedicalEmergency {
  id: string;
  seatNumber: string;
  status: 'active' | 'resolved';
  timestamp: string;
}

export interface IssueReport {
  id: string;
  category: 'Seat Occupancy' | 'Harassment' | 'Broken Seat' | 'Dirty Washroom' | 'Other';
  seatNumber: string;
  description: string;
  status: 'open' | 'resolved';
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
