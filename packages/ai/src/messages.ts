type MessagePart = {
  type?: string;
  text?: string;
};

type MessageLike = {
  role?: string;
  content?: string;
  parts?: MessagePart[];
};

export function getMessageText(message: MessageLike) {
  if (typeof message.content === "string") {
    return message.content;
  }

  if (!Array.isArray(message.parts)) {
    return "";
  }

  return message.parts
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .join("\n");
}

export function getLastUserMessageText(messages: MessageLike[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role === "user") {
      return getMessageText(message);
    }
  }

  return "";
}
