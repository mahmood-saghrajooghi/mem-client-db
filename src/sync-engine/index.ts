// useClient

import { ApplicationStore } from './application-store';
import { Task } from './models/task';
import { User } from './models/user';

const applicationStore = ApplicationStore.instance;

console.log(applicationStore);


const user = User.create({
  name: "John Doe",
});

user.save();

const task = Task.create(user, {
  title: "Task 1",
})

task.save();

console.log(task.assignee);
