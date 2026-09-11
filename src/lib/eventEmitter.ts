import { EventEmitter } from 'events';

const globalForEvents = globalThis as unknown as {
  appEventEmitter?: EventEmitter;
};

export const appEventEmitter =
  globalForEvents.appEventEmitter || new EventEmitter();

// Ensure max listeners doesn't warn under concurrent clients
appEventEmitter.setMaxListeners(200);

if (process.env.NODE_ENV !== 'production') {
  globalForEvents.appEventEmitter = appEventEmitter;
}
