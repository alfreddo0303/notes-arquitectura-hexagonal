import { createConnection, getCustomRepository } from 'typeorm';
import { NoteCreator } from '../Modules/Notes/application/NoteCreator';
import { FakeNoteRepository } from '../Modules/Notes/infrastructure/fakeNoteRepository';
import { SendWelcomeEmail } from '../Modules/Notifications/application/SendWelcomeEmail';
import { SendWelcomeEmailOnUserRegistered } from '../Modules/Notifications/application/SendWelcomeEmailOnUserRegistered';
import { exampleEvent } from '../Modules/Notifications/exampleEvent';
import { FakeEmailSender } from '../Modules/Notifications/infrastructure/FakeEmailSender';
import { EventBus } from '../Modules/Shared/domain/EventBus';
import { InMemorySyncEventBus } from '../Modules/Shared/infrastructure/EventBus/InMemorySyncEventBus';
import { IncrementTotalNotesCreatedOnNoteCreated } from '../Modules/User/application/TotalNotesCreatedIncrement/IncrementTotalNotesCreatedOnNoteCreated';
import { TotalNotesCreatedIncrementer } from '../Modules/User/application/TotalNotesCreatedIncrement/TotalNotesCreatedIncrementer';
import { UserFinderById } from '../Modules/User/application/UserFinderById';
import { Params, UserRegister } from '../Modules/User/application/UserRegister';
import { Hashing } from '../Modules/User/domain/Hashing';
import { UserId } from '../Modules/User/domain/UserId';
import { UserRepository } from '../Modules/User/domain/UserRepository';
import { BcryptHasher } from '../Modules/User/infrastructure/BcryptHashing';
import { InMemoryUserRepository } from '../Modules/User/infrastructure/persistence/InMemoryUserRepository';
import { TypeOrmUserRepository } from '../Modules/User/infrastructure/persistence/TypeOrmUserRepository';

class start {
  //private repositoryInMemory: UserRepository  = new InMemoryUserRepository();
  private ormRepository: UserRepository;
  private hasherBcrypt: Hashing = new BcryptHasher();
  private eventBusFake: EventBus = new InMemorySyncEventBus();

  constructor() {
    this.run();
  }

  async init() {
    console.log(`Initttt: base de datos`);
    const conex = await createConnection();
    this.ormRepository = getCustomRepository(TypeOrmUserRepository);
    return conex;
  }
  async run() {
    await this.init();
    // Preparando EventBus en Memoria

    this.eventBusFake.addSubscribe(new exampleEvent());
    this.eventBusFake.addSubscribe(new SendWelcomeEmailOnUserRegistered(new SendWelcomeEmail(new FakeEmailSender())));
    this.eventBusFake.addSubscribe(
      new IncrementTotalNotesCreatedOnNoteCreated(new TotalNotesCreatedIncrementer(this.ormRepository))
    );

    let register = new UserRegister(this.hasherBcrypt, this.ormRepository, this.eventBusFake);
    const idid = UserId.random();
    const id = new UserId(idid.value);
    const user: Params = {
      id: idid.value,
      name: 'Alf Ville',
      email: 'alfreddo444@hotmail.com',
      password: '12345678'
    };

    console.log('creaaaarrr En repository');
    try {
      await register.run(user);
    } catch (error) {
      return console.log('Capturando exepcion: ' + error);
    }
    let finder = new UserFinderById(this.ormRepository);
    console.log('buscarrrrrrrr repository');
    let result = await finder.run(id);
    console.log(result);

    let noteCreator = new NoteCreator(new FakeNoteRepository(), this.eventBusFake);
    await noteCreator.run({ body: 'Esta es la nota', title: 'titulo de nota', userCreator: result.id.value });
    await noteCreator.run({ body: 'Esta es la nota2', title: 'titulo de nota2', userCreator: result.id.value });

    console.log(await finder.run(result.id));
    console.log('finalll');
  }
}

const app = new start();
