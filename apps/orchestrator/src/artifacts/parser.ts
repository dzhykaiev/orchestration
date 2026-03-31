import type { ArtifactType, CreateArtifactInput } from "@orchestration/shared";

interface ParseContext {
  projectId: string;
  taskId?: string;
  workstreamId?: string;
}

interface ParsedBlock {
  type: ArtifactType;
  name: string;
  content: string;
}

const CODE_BLOCK_RE = /```(\w+)?\n([\s\S]*?)```/g;
const DIFF_RE = /^(?:diff --git|--- a\/|@@\s)/m;
const TEST_KEYWORDS = /(?:PASS|FAIL|✓|✕|test\s+suite|tests?\s+passed|tests?\s+failed)/i;

function classifyCodeBlock(lang: string | undefined, content: string): ArtifactType {
  if (lang === "diff" || DIFF_RE.test(content)) return "code_diff";
  if (TEST_KEYWORDS.test(content)) return "test_result";
  if (lang === "json" || lang === "yaml" || lang === "toml") return "config";
  return "code_diff";
}

function extractCodeBlocks(output: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  let index = 0;

  CODE_BLOCK_RE.lastIndex = 0;
  let match = CODE_BLOCK_RE.exec(output);
  while (match !== null) {
    const lang = match[1];
    const content = match[2]?.trim();
    if (!content || content.length < 10) continue;

    const type = classifyCodeBlock(lang, content);
    blocks.push({
      type,
      name: `${type}-${index++}${lang ? `.${lang}` : ""}`,
      content,
    });
    match = CODE_BLOCK_RE.exec(output);
  }

  return blocks;
}

function extractProseDocument(output: string): ParsedBlock | null {
  // Remove code blocks, keep only prose
  const prose = output.replace(CODE_BLOCK_RE, "").trim();
  if (prose.length < 50) return null;

  return {
    type: "document",
    name: "agent-output",
    content: prose,
  };
}

export function parseArtifacts(output: string, ctx: ParseContext): CreateArtifactInput[] {
  if (!output || output.length < 20) return [];

  const artifacts: CreateArtifactInput[] = [];
  const codeBlocks = extractCodeBlocks(output);

  for (const block of codeBlocks) {
    artifacts.push({
      projectId: ctx.projectId,
      taskId: ctx.taskId,
      workstreamId: ctx.workstreamId,
      type: block.type,
      name: block.name,
      content: block.content,
    });
  }

  const doc = extractProseDocument(output);
  if (doc) {
    artifacts.push({
      projectId: ctx.projectId,
      taskId: ctx.taskId,
      workstreamId: ctx.workstreamId,
      type: doc.type,
      name: doc.name,
      content: doc.content,
    });
  }

  return artifacts;
}
