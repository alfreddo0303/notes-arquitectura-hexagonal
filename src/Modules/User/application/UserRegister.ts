import { EventBus } from '../../Shared/domain/EventBus';
import { Hashing } from '../domain/Hashing';
import { HashUserPassword } from '../domain/HashUserPassword';
import { User } from '../domain/User';
import { UserEmail } from '../domain/UserEmail';
import { UserId } from '../domain/UserId';
import { UserName } from '../domain/UserName';
import { UserPassword } from '../domain/UserPassword';
import { UserRepository } from '../domain/UserRepository';

export type Params = {
  id: string;
  name: string;
  email: string;
  password: string;
};

export class UserRegister {
  private repository: UserRepository;
  private hashUserPasswordService: HashUserPassword;
  private eventBus: EventBus;

  constructor(hashing: Hashing, repository: UserRepository, eventBus: EventBus) {
    this.repository = repository;
    this.hashUserPasswordService = new HashUserPassword(hashing);
    this.eventBus = eventBus;
  }

  async run({ id, name, email, password }: Params): Promise<void> {
    const userEmail = new UserEmail(email);

    if (await this.repository.userEmailExist(userEmail)) {
      throw new Error(`this email: ${email} exists`);
    }

    const userPassword = await this.hashUserPasswordService.run(new UserPassword(password));

    const user = User.create(new UserId(id), new UserName(name), userEmail, userPassword);

    await this.repository.save(user);

    console.log('publicar eventos');

    this.eventBus.publish(user.extractDomainEvents());
  }
}
