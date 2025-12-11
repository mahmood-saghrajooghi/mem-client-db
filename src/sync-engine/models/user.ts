import { Model } from '../model';
import { ClientModel, Property } from '../model-registry';
import { Task } from './task';

@ClientModel("User")
export class User extends Model {
  @Property()
  declare name: string | undefined;

  assignedTasks: Task[] = [];

  static createEmpty(): User {
    return new this;
  }

  static create(data: { name: string }): User {
    const { name } = data;

    const user = this.createEmpty();

    user.name = name;

    return user;
  }
}
