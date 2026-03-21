import { google } from "googleapis";
import { getAuthenticatedClient } from "@/lib/gmail/client";

export type ChatSpace = {
  name: string;
  displayName?: string;
  spaceType: string;
  singleUserBotDm?: boolean;
  spaceUri?: string;
};

export type ChatMessage = {
  name: string;
  text?: string;
  formattedText?: string;
  sender: { name: string; displayName?: string; type?: string };
  createTime: string;
  thread?: { name: string };
};

export async function listSpaces(): Promise<ChatSpace[]> {
  const auth = await getAuthenticatedClient();
  if (!auth) throw new Error("Not authenticated with Google");

  const chat = google.chat({ version: "v1", auth: auth.oauth2Client });
  const res = await chat.spaces.list({ pageSize: 100 });

  const spaces = res.data.spaces ?? [];
  return spaces
    .filter((s) => !s.singleUserBotDm)
    .map((s) => ({
      name: s.name ?? "",
      displayName: s.displayName ?? undefined,
      spaceType: s.spaceType ?? "SPACE",
      singleUserBotDm: s.singleUserBotDm ?? undefined,
      spaceUri: s.spaceUri ?? undefined,
    }));
}

export async function listMessages(
  spaceName: string,
  pageToken?: string
): Promise<{ messages: ChatMessage[]; nextPageToken?: string }> {
  const auth = await getAuthenticatedClient();
  if (!auth) throw new Error("Not authenticated with Google");

  const chat = google.chat({ version: "v1", auth: auth.oauth2Client });
  const res = await chat.spaces.messages.list({
    parent: spaceName,
    pageSize: 50,
    orderBy: "createTime desc",
    pageToken,
  });

  const messages = (res.data.messages ?? []).map((m) => ({
    name: m.name ?? "",
    text: m.text ?? undefined,
    formattedText: m.formattedText ?? undefined,
    sender: {
      name: m.sender?.name ?? "",
      displayName: m.sender?.displayName ?? undefined,
      type: m.sender?.type ?? undefined,
    },
    createTime: m.createTime ?? "",
    thread: m.thread?.name ? { name: m.thread.name } : undefined,
  }));

  return {
    messages,
    nextPageToken: res.data.nextPageToken ?? undefined,
  };
}

export async function sendMessage(
  spaceName: string,
  text: string
): Promise<ChatMessage> {
  const auth = await getAuthenticatedClient();
  if (!auth) throw new Error("Not authenticated with Google");

  const chat = google.chat({ version: "v1", auth: auth.oauth2Client });
  const res = await chat.spaces.messages.create({
    parent: spaceName,
    requestBody: { text },
  });

  const m = res.data;
  return {
    name: m.name ?? "",
    text: m.text ?? undefined,
    formattedText: m.formattedText ?? undefined,
    sender: {
      name: m.sender?.name ?? "",
      displayName: m.sender?.displayName ?? undefined,
      type: m.sender?.type ?? undefined,
    },
    createTime: m.createTime ?? "",
    thread: m.thread?.name ? { name: m.thread.name } : undefined,
  };
}
