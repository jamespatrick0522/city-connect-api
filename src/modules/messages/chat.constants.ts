export const CHAT_EVENTS = {
  JOIN_ESTABLISHMENT_INBOX: 'joinEstablishmentInbox',
  JOIN_GUEST_CONVERSATION: 'joinGuestConversation',
  LEAVE_GUEST_CONVERSATION: 'leaveGuestConversation',
  MESSAGE_NEW: 'message.new',
  MESSAGE_SENT: 'message.sent',
  MESSAGE_FAILED: 'message.failed',
} as const;

export function normalizeGuestIdentifier(value: string): string {
  return encodeURIComponent(value.trim().toLowerCase());
}

export function buildEstablishmentRoom(establishmentId: string): string {
  return `chat:establishment:${establishmentId}`;
}

export function buildGuestConversationRooms(
  establishmentId: string,
  guestEmail?: string | null,
  guestPhone?: string | null,
): string[] {
  const rooms: string[] = [];

  if (guestEmail?.trim()) {
    rooms.push(
      `chat:guest-email:${establishmentId}:${normalizeGuestIdentifier(guestEmail)}`,
    );
  }

  if (guestPhone?.trim()) {
    rooms.push(
      `chat:guest-phone:${establishmentId}:${normalizeGuestIdentifier(guestPhone)}`,
    );
  }

  return rooms;
}
