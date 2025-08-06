import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  newEmail?: string | null;
  oldEmailToken?: string | null;
  newEmailToken?: string | null;
  avatarId?: string;
}
