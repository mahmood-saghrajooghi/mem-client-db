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
}
