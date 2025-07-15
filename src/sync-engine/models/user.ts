import { Model } from '../model';
import { ClientModel, Property } from '../model-registry';
import { Task } from './task';

@ClientModel("User")
export class User extends Model {
  id!: string;

  @Property()
  public name: string | undefined;

  assignedTasks: Task[] = [];
}
