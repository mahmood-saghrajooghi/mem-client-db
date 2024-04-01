import { Model } from './base';

export class Collection<M extends Model = Model> {
  private instances: Map<string, M>;

  constructor() {
    this.instances = new Map<string, M>();
  }

  setMultiple(instances: M[]): void {
    instances.forEach((instance) => {
      this.instances.set((instance as any).id, instance);
    });
  }

  add(instance: M): void {
    this.instances.set((instance as any).id, instance);
  }

  getById(id: string): M | undefined {
    return this.instances.get(id);
  }

  getAll(): M[] {
    return Array.from(this.instances.values());
  }
}
