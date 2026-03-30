export interface FileChange {
  path: string;
  content: string;
}

const XML_FILE_REGEX = /<file\s+path="([^"]+)">\n?([\s\S]*?)<\/file>/g;
const MARKDOWN_FILE_REGEX = /```\w*:([^\n]+)\n([\s\S]*?)```/g;

export function parseFileChanges(response: string): FileChange[] {
  // Try XML <file> tags first (preferred format)
  let files = parseXmlFiles(response);
  if (files.length > 0) return files;

  // Fallback: annotated markdown code blocks (```lang:path)
  files = parseMarkdownFiles(response);
  return files;
}

function parseXmlFiles(response: string): FileChange[] {
  const files: FileChange[] = [];
  const regex = new RegExp(XML_FILE_REGEX.source, "g");
  let match: RegExpExecArray | null;

  while ((match = regex.exec(response)) !== null) {
    files.push({
      path: match[1]!.trim(),
      content: match[2]!,
    });
  }

  return files;
}

function parseMarkdownFiles(response: string): FileChange[] {
  const files: FileChange[] = [];
  const regex = new RegExp(MARKDOWN_FILE_REGEX.source, "g");
  let match: RegExpExecArray | null;

  while ((match = regex.exec(response)) !== null) {
    files.push({
      path: match[1]!.trim(),
      content: match[2]!,
    });
  }

  return files;
}
