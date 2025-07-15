// useClient

import { ApplicationStore } from './application-store';
import { Task } from './models/task';
import { User } from './models/user';

const applicationStore = ApplicationStore.instance;

console.log(applicationStore);

const task = new Task();
const user = new User();

user.id = "1";

task.assigneeId = "1";
