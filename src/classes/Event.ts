import { ClientEvents } from "discord.js";
import Bot from "./Bot";

export abstract class EventExecutable {
  constructor() {}
  async execute(bot: Bot, ...args: any): Promise<any> {
    console.error('brurh');
  }
}

export interface EventData {
  name: keyof ClientEvents;
  once: boolean;
}

export interface Event {
  Impl: new () => EventExecutable;
  name: keyof ClientEvents;
  once: boolean;
}
