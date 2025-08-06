import { PassportSerializer } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { UsersService } from '../users/users.service';

@Injectable()
export class LocalSerializer extends PassportSerializer {
  constructor(private readonly usersService: UsersService) {
    super();
  }

  serializeUser(user: User, done: CallableFunction) {
    done(null, user.id);
  }

  async deserializeUser(userId: string, done: CallableFunction) {
    try {
      const user = await this.usersService.findById(userId);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  }
}
