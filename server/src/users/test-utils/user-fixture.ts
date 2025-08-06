import { faker } from '@faker-js/faker';
import { UserWithAvatar } from '../types';

export const userFixture = (
  attrs?: Partial<UserWithAvatar>,
): UserWithAvatar => {
  return {
    id: '1',
    email: faker.internet.email(),
    avatarId: null,
    avatar: null,
    confirmedAt: null,
    newEmail: null,
    newEmailToken: null,
    oldEmailToken: null,
    password: faker.internet.password(),
    createdAt: faker.date.past(),
    name: faker.person.fullName(),
    ...attrs,
  };
};
