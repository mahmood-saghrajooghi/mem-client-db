// useClient
import { BaseModel, ManyToOne, Model, OneToMany } from './base';
import { Collection } from './collection';


@BaseModel("user")
export class User extends Model {
  public name: string | undefined;
  public email: string | undefined;

  public static readonly modelName = "user";

  @OneToMany(() => Task)
  public readonly tasks = new Collection<Task>();
};

@BaseModel("task")
export class Task extends Model {
  constructor(values?: Partial<Task>) {
    super();
    if (values) {
      Object.assign(this, values);
    }
  }


  public static readonly modelName = "task";

  public title: string | undefined;

  user_id: string | undefined;

  @ManyToOne(() => User, "tasks")
  public user: User | undefined;
}


const user = new User({ name: "John Doe" });
const task = new Task({ user_id: (user as any).id });
