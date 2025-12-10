// useClient

import { ApplicationStore } from './application-store';
import { Task } from './models/task';
import { User } from './models/user';

const applicationStore = ApplicationStore.instance;

const task = new Task("1");
const user = new User("1");

task.assigneeId = "1";

window.task = Task;

console.log(task.assignee);
