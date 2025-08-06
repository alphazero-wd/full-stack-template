export interface User {
  id: number;
  name: string;
  email: string;
  createdAt: Date;
  avatar: Avatar | null;
  confirmedAt: Date | null;
}

export interface Avatar {
  id: number;
  key: string;
  isLocal: boolean;
  url: string;
}
export interface Profile extends Omit<User, "email"> {}
