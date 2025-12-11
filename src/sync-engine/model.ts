import type { ApplicationSyncedStore } from './application-synced-store';
import { LoadStrategy, ModelRegistry } from './model-registry';

export class Model {
  // This is set by ClientModel decorator
  modelName!: string;

  id!: string;

  static store: ApplicationSyncedStore;

  store: ApplicationSyncedStore;


  loadStrategy: typeof LoadStrategy[keyof typeof LoadStrategy];

  declare createdAt: Date | null;
  declare updatedAt: Date | null;
  declare archivedAt: Date | null;
  modelClass: Function

  __data: Record<string, any> = {};

  // Stores the old value of the modified properties
  public modifiedProperties: Record<string, any> = {};

  public get properties() {
    return ModelRegistry.propertiesOfModel(this.modelName)
  }

  static get modelName() {
    return this.prototype.modelName
  }


  static createEmpty() {
    return new this;
  }

  constructor() {
    this.store = Model.store
    this.modelClass = this.constructor;
    // todo: add more load strategies later
    this.loadStrategy = LoadStrategy.instant;
    this.id = crypto.randomUUID();
  }

  save(isCreate: boolean = false, options: unknown = {}) {
    const transaction = this.store.save(this, isCreate, options)

    return transaction;
  }

  public propertyChanged(propertyName: string, oldValue: any, newValue: any) {
    const property = this.properties?.[propertyName];

    if(property){
      this.markPropertyChanged(propertyName, oldValue);
    }


    // todo: handle referenced properties
    // if(property?.referencedProperty) {
    //   this.referencedPropertyChanged(property.referencedProperty, oldValue, newValue);
    // }
  }

  private serializedValue(propertyName: string, value: any) {
    const property = this.properties?.[propertyName];

    if(!property) {
      return null;
    }

    if(property.serializer) {
      property.serializer.serialize(value);
    }

    return value;
  }

  // Bookkeeping for modified properties and store the old value
  markPropertyChanged(propertyName: string, oldValue: any) {
    const property = this.properties?.[propertyName];

    const oldSerializedValue = this.serializedValue(propertyName, oldValue);
    const newSerializedValue = this.serializedValue(propertyName, this[propertyName as keyof this])

    if(oldSerializedValue !== newSerializedValue) {
      this.modifiedProperties[propertyName] = oldValue;
    }
  }

  serialize(): string {
    // TODO: implement this
    return '{}';
  }

  attachToReferencedProperties(): void {
    // TODO: implement this
  }

  clearSnapshot(): void {
    // TODO: implement this
  }

  createMutation(set: Set<any>, additionalCreationArgs: unknown = {}): string {
    // TODO: implement this
    return '';
  }
}
