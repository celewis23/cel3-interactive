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

export async function createSpace(params: {
  displayName: string;
  spaceType: "SPACE" | "GROUP_CHAT";
  description?: string;
}): Promise<ChatSpace> {
  const auth = await getAuthenticatedClient();
  if (!auth) throw new Error("Not authenticated with Google");

  const chat = google.chat({ version: "v1", auth: auth.oauth2Client });
  const requestBody: Record<string, unknown> = {
    displayName: params.displayName,
    spaceType: params.spaceType,
  };
  if (params.description) {
    requestBody.spaceDetails = { description: params.description };
  }
  const res = await chat.spaces.create({ requestBody });
  const s = res.data;
  return {
    name: s.name ?? "",
    displayName: s.displayName ?? undefined,
    spaceType: s.spaceType ?? params.spaceType,
    singleUserBotDm: s.singleUserBotDm ?? undefined,
    spaceUri: s.spaceUri ?? undefined,
  };
}

export async function deleteSpace(spaceName: string, spaceType: string): Promise<void> {
  const auth = await getAuthenticatedClient();
  if (!auth) throw new Error("Not authenticated with Google");

  const chat = google.chat({ version: "v1", auth: auth.oauth2Client });

  if (spaceType === "DIRECT_MESSAGE") {
    // DMs can't be deleted via spaces.delete — leave the conversation instead
    await chat.spaces.members.delete({ name: `${spaceName}/members/me` });
  } else {
    await chat.spaces.delete({ name: spaceName });
  }
}

export async function findOrCreateDM(email: string): Promise<ChatSpace> {
  const auth = await getAuthenticatedClient();
  if (!auth) throw new Error("Not authenticated with Google");

  const chat = google.chat({ version: "v1", auth: auth.oauth2Client });

  // Try to find existing DM first
  try {
    const res = await chat.spaces.findDirectMessage({ name: `users/${email}` });
    const s = res.data;
    return {
      name: s.name ?? "",
      displayName: s.displayName ?? email,
      spaceType: "DIRECT_MESSAGE",
      singleUserBotDm: s.singleUserBotDm ?? undefined,
      spaceUri: s.spaceUri ?? undefined,
    };
  } catch {
    // No existing DM — create one via spaces.setup
  }

  const res = await chat.spaces.setup({
    requestBody: {
      space: { spaceType: "DIRECT_MESSAGE" },
      memberships: [{ member: { name: `users/${email}`, type: "HUMAN" } }],
    },
  });
  const s = res.data;
  return {
    name: s.name ?? "",
    displayName: s.displayName ?? email,
    spaceType: "DIRECT_MESSAGE",
    singleUserBotDm: s.singleUserBotDm ?? undefined,
    spaceUri: s.spaceUri ?? undefined,
  };
}

export async function deleteMessage(messageName: string): Promise<void> {
  const auth = await getAuthenticatedClient();
  if (!auth) throw new Error("Not authenticated with Google");

  const chat = google.chat({ version: "v1", auth: auth.oauth2Client });
  await chat.spaces.messages.delete({ name: messageName });
}

export async function updateMessage(messageName: string, text: string): Promise<ChatMessage> {
  const auth = await getAuthenticatedClient();
  if (!auth) throw new Error("Not authenticated with Google");

  const chat = google.chat({ version: "v1", auth: auth.oauth2Client });
  const res = await chat.spaces.messages.patch({
    name: messageName,
    updateMask: "text",
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

export async function listMembers(spaceName: string): Promise<{ name: string; displayName?: string; email?: string; role: string }[]> {
  const auth = await getAuthenticatedClient();
  if (!auth) throw new Error("Not authenticated with Google");

  const chat = google.chat({ version: "v1", auth: auth.oauth2Client });
  const res = await chat.spaces.members.list({ parent: spaceName, pageSize: 100 });
  const members = res.data.memberships ?? [];
  return members.map((member) => ({
    name: member.name ?? "",
    displayName: member.member?.displayName ?? undefined,
    email: member.member?.name ?? undefined,
    role: member.role ?? "ROLE_MEMBER",
  }));
}

export async function addMember(spaceName: string, email: string): Promise<void> {
  const auth = await getAuthenticatedClient();
  if (!auth) throw new Error("Not authenticated with Google");

  const chat = google.chat({ version: "v1", auth: auth.oauth2Client });
  await chat.spaces.members.create({
    parent: spaceName,
    requestBody: {
      member: { name: `users/${email}`, type: "HUMAN" },
      role: "ROLE_MEMBER",
    },
  });
}

export async function removeMember(spaceName: string, memberName: string): Promise<void> {
  const auth = await getAuthenticatedClient();
  if (!auth) throw new Error("Not authenticated with Google");

  const chat = google.chat({ version: "v1", auth: auth.oauth2Client });
  await chat.spaces.members.delete({ name: memberName });
}
