import { LoadStrategy, ModelRegistry } from './model-registry';
import type { LoadStrategyType } from './model-registry';
import type { Store } from './store-manager';

export class Model {
  // This is set by ClientModel decorator
  modelName!: string;

  static store: Store;

  store: Store;

  loadStrategy: LoadStrategyType;

  __data: Record<string, any> = {};

  // Stores the old value of the modified properties
  public modifiedProperties: Record<string, any> = {};

  public get properties() {
    return ModelRegistry.propertiesOfModel(this.modelName)
  }


  constructor() {
    this.store = Model.store
    // todo: add more load strategies later
    this.loadStrategy = LoadStrategy.instant;
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
}
