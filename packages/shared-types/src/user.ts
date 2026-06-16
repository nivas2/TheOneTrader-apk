export interface IUser {
  _id: string;
  name: string;
  email: string;
  passwordHash: string;
  phone: string;
  isVerified: boolean;
  deviceToken?: string;
  currentSessionId?: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export type UserRole = 'USER' | 'ADMIN';

export interface IUserCreate {
  name: string;
  email: string;
  password: string;
  phone: string;
}

export interface IUserLogin {
  email: string;
  password: string;
}

export interface IUserPublic {
  _id: string;
  name: string;
  email: string;
  phone: string;
  isVerified: boolean;
  role: UserRole;
  createdAt: Date;
}
