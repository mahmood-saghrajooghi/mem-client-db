import { Model} from '../model';
import { Reference } from '../model-property';
import { ClientModel, Property } from '../model-registry';
import { User } from './user';

@ClientModel("Task")
export class Task extends Model {
  @Property()
  declare title: string | undefined;

  @Reference(() => User, "assignee", { nullable: true })
  declare assignee: User | null;

  declare assigneeId: string | null;

  static createEmpty() {
    return new this;
  }

  // TODO: add type for data
  static create(user: User, data: unknown) {
    const { title, assignee } = data;

    const task = this.createEmpty();


    task.title = title;
    // task.assignee = user;
    task.assigneeId = user.id;

    return task;
  }
}
