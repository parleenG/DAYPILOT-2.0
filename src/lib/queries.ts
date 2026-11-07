import { queryOptions } from "@tanstack/react-query";
import { getMe, listTasks, listMissions, getMission, getHousehold, listNotifications } from "./data.functions";
import { getChat } from "./assistant.functions";

export const meQuery = queryOptions({ queryKey: ["me"], queryFn: () => getMe() });
export const tasksQuery = queryOptions({ queryKey: ["tasks"], queryFn: () => listTasks() });
export const missionsQuery = queryOptions({ queryKey: ["missions"], queryFn: () => listMissions() });
export const missionQuery = (id: string) => queryOptions({ queryKey: ["missions", id], queryFn: () => getMission({ data: { id } }) });
export const householdQuery = queryOptions({ queryKey: ["household"], queryFn: () => getHousehold() });
export const notificationsQuery = queryOptions({ queryKey: ["notifications"], queryFn: () => listNotifications() });
export const chatQuery = queryOptions({ queryKey: ["chat"], queryFn: () => getChat() });

// Keys affected by any task/mission change, so dashboard + lists + details stay in sync.
export const SYNC_KEYS = [["tasks"], ["missions"], ["household"]] as const;
