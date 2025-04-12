// TODO: To be moved to user-service
export interface User {
  userId: string;
  walletIds: string[];
  userName?: string;
  email?: string;
}

// TODO: To be moved to user-service
export interface UsersFile {
  users: User[];
} 