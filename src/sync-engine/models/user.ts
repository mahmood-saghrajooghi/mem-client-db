import { Model } from '../model';
import { ClientModel, Property } from '../model-registry';
import { Task } from './task';

@ClientModel("User")
export class User extends Model {
  @Property()
  declare name: string | undefined;

  assignedTasks: Task[] = [];
}
