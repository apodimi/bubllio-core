const mailpitUrl = process.env.MAILPIT_URL ?? "http://127.0.0.1:8025";

interface MailpitAddress {
  Address: string;
  Name: string;
}

export interface MailpitMessage {
  ID: string;
  From: MailpitAddress;
  To: MailpitAddress[];
  Subject: string;
}

interface MailpitMessagesResponse {
  messages: MailpitMessage[];
}

interface MailpitMessageContent {
  HTML: string;
  Text: string;
}

export async function clearLocalInbox(): Promise<void> {
  const response = await fetch(`${mailpitUrl}/api/v1/messages`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`Could not clear the local inbox (${response.status})`);
  }
}

export async function waitForLocalEmail(
  recipient: string,
): Promise<MailpitMessage> {
  const deadline = Date.now() + 10_000;

  while (Date.now() < deadline) {
    const response = await fetch(`${mailpitUrl}/api/v1/messages`);

    if (!response.ok) {
      throw new Error(`Could not read the local inbox (${response.status})`);
    }

    const inbox = (await response.json()) as MailpitMessagesResponse;
    const message = inbox.messages.find((candidate) =>
      candidate.To.some((address) => address.Address === recipient),
    );

    if (message) {
      return message;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`No local email arrived for ${recipient} within 10 seconds`);
}

export async function getLocalEmailContent(
  messageId: string,
): Promise<MailpitMessageContent> {
  const response = await fetch(`${mailpitUrl}/api/v1/message/${messageId}`);

  if (!response.ok) {
    throw new Error(`Could not read the local email (${response.status})`);
  }

  return response.json() as Promise<MailpitMessageContent>;
}
