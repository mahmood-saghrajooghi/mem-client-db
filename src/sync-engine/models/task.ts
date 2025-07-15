import { Model} from '../model';
import { Reference } from '../model-property';
import { ClientModel, Property } from '../model-registry';
import { User } from './user';

@ClientModel("Task")
export class Task extends Model {
  @Property()
  public title: string | undefined;

  @Reference(() => User, "assignedTasks", { nullable: true })
  assignee!: User | null;

  assigneeId!: string | null;
}
