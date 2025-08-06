import { File, User } from '@prisma/client';
import { Exclude } from 'class-transformer';

export class AuthResponse implements User {
  id: string;
  name: string;
  email: string;

  @Exclude()
  avatarId: string;

  avatar: File | null;
  confirmedAt: Date | null;

  @Exclude()
  newEmail: string | null;

  @Exclude()
  password: string;
  createdAt: Date;

  @Exclude()
  newEmailToken: string | null;
  @Exclude()
  oldEmailToken: string | null;
}
