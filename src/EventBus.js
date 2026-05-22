export class EventBus {
  constructor() {
    this.subscribers = new Map();
  }

  on(eventName, handler) {
    if (!this.subscribers.has(eventName)) {
      this.subscribers.set(eventName, []);
    }
    this.subscribers.get(eventName).push(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.subscribers.get(eventName);
      const index = handlers.indexOf(handler);
      if (index > -1) handlers.splice(index, 1);
    };
  }

  emit(eventName, data) {
    if (!this.subscribers.has(eventName)) return;
    this.subscribers.get(eventName).forEach(handler => {
      try {
        handler(data);
      } catch (err) {
        console.error(`EventBus error on ${eventName}:`, err);
      }
    });
  }

  clear() {
    this.subscribers.clear();
  }
}

export const eventBus = new EventBus();
