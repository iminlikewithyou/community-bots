export type CustomMentionSuffix = {
  type: "custom",
  suffix: string,
  content: string
}

export type CommaMentionSuffix = {
  type: "comma",
  content: string
}

export type ReplySuffix = CustomMentionSuffix | CommaMentionSuffix;

export function withHeader()

export function dotted(content: string): string {
  return "• " + content;
}

export function inlineDottedMention(content: string): ReplySuffix {
  return {
    type: "custom",
    suffix: " ",
    content: dotted(content)
  }
}

export function commaMention(content: string): ReplySuffix {
  return {
    type: "comma",
    content: content
  }
}

// export function customMention(content: string): ReplySuffix {

// }