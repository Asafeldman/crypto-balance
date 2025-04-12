export interface User {
  userId: string;
  walletIds: string[];
  userName: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface UsersFile {
  users: User[];
} 