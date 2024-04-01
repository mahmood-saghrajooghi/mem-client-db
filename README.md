Client in memory database


Inspired by Tuomas Artman's talk at 2020 [React Helsinki meetup](), I decided to create a simple in memory database.

The approach is to use the decorators to define the relationships between the models.

When using the `@OneToMany` decorator on a property like this:

```typescript
class User {
  public static modelName = 'user';

  @OneToMany(() => Task)
  tasks: Task[];
}
```

when accessing the `posts` property, the decorator will automatically find and return all the posts that have the same `user_id` as the current user. the `user_id` is the foreign key that is used to define the relationship between the `User` and `Task` models. It is derived from the `modelName` property of the `User` model.

The `@ManyToOne` decorator is used to define the inverse relationship. It is used on the property that is the foreign key in the relationship.

```typescript
class Task {
  public static modelName = 'task';

  user_id: number;

  @ManyToOne(() => User, 'tasks')
  user: User;
}
```

when accessing the `user` property, the decorator will automatically find and return the user that has the same `user_id` as the current task, it will also add the task to the user's `tasks` collection.
The `ManyToOne` decorator expects the `user_id` property to be the foreign key because it is called on the property `user`.
