export interface UserProfile {
  uid: string;
  username: string;
  photoURL: string;
  role?: string;
  roles?: string[];
  banned?: boolean;
  ipBanned?: boolean;
  hardwareBanned?: boolean;
  accountNumber?: number;
  joinNumber?: number;
  joinedDate?: string;
  views?: number;
  status?: string;
  bio?: string;
  tags?: string[];
  friends?: string[];
  friendRequestsIncoming?: string[];
  warnings?: { text: string; date: any; read?: boolean }[];
  timeoutUntil?: any;
  createdAt?: any;
  updatedAt?: any;
}

export interface ChatMessage {
  id: string;
  text: string;
  username: string;
  avatar: string;
  uid: string;
  channel: string;
  imageUrl?: string;
  timestamp?: any;
  participants?: string[];
}

export interface CurrentUser {
  uid: string;
  username: string;
  photoURL: string;
  isAdmin: boolean;
  banned: boolean;
  role?: string;
  roles?: string[];
  friends?: string[];
  friendRequestsIncoming?: string[];
  bio?: string;
  timeoutUntil?: any;
  joinNumber?: number;
}

