export interface User {
  userId: string;
  userName: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface UsersFile {
  users: User[];
} 