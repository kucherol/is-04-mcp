#!/usr/bin/env node
/**
 * excalidraw-scenes - MCP server for working with .excalidraw scene files.
 *
 * Tools:
 *   - list_scenes(dir):       list .excalidraw files under a directory (recursive)
 *   - read_scene(path):       return parsed JSON of one scene
 *   - validate_scene(json):   validate Excalidraw JSON with Zod and return diagnostics
 *   - extract_text(path):     return all text-element strings from a scene
 *
 * Resource:
 *   - excalidraw://docs/architecture - exposes architecture-focused content from dev-docs/
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, extname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type SceneElement = {
  type?: unknown;
  text?: unknown;
};

type SceneLike = {
  type?: unknown;
  version?: unknown;
  source?: unknown;
  elements?: unknown;
  appState?: unknown;
  files?: unknown;
};

const currentFileDir = dirname(fileURLToPath(import.meta.url));

function isPathInside(baseDir: string, candidatePath: string): boolean {
  const rel = relative(baseDir, candidatePath);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

async function isDirectory(path: string): Promise<boolean> {
  const info = await stat(path).catch(() => null);
  return Boolean(info?.isDirectory());
}

async function detectRepoRoot(): Promise<string> {
  const candidateFromCwd = resolve(process.cwd());
  if (await isDirectory(resolve(candidateFromCwd, "dev-docs"))) {
    return candidateFromCwd;
  }

  // dist/server.js -> excalidraw-scenes-ts/dist/server.js
  // repo root is three levels up from dist/.
  const candidateFromBundle = resolve(currentFileDir, "..", "..", "..");
  if (await isDirectory(resolve(candidateFromBundle, "dev-docs"))) {
    return candidateFromBundle;
  }

  throw new Error("Could not locate repository root containing dev-docs/.");
}

const REPO_ROOT = await detectRepoRoot();

function resolveWithinRepo(inputPath: string): string {
  const candidate = isAbsolute(inputPath)
    ? resolve(inputPath)
    : resolve(REPO_ROOT, inputPath);
  if (!isPathInside(REPO_ROOT, candidate)) {
    throw new Error(
      `Path escapes repository root: ${inputPath}. Expected a path under ${REPO_ROOT}`,
    );
  }
  return candidate;
}

function toRepoRelative(path: string): string {
  return relative(REPO_ROOT, path).replaceAll("\\", "/");
}

async function collectSceneFilesRecursively(dirPath: string): Promise<string[]> {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const nestedLists = await Promise.all(
    entries.map(async (entry) => {
      const absolute = resolve(dirPath, entry.name);
      if (entry.isDirectory()) {
        return collectSceneFilesRecursively(absolute);
      }
      if (entry.isFile() && entry.name.endsWith(".excalidraw")) {
        return [absolute];
      }
      return [];
    }),
  );
  return nestedLists.flat();
}

function parseSceneJson(raw: string): SceneLike {
  const parsed = JSON.parse(raw) as unknown;
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Scene JSON must be an object.");
  }
  return parsed as SceneLike;
}

const sceneValidationSchema = z
  .object({
    type: z.string().optional(),
    version: z.number().int().nonnegative().optional(),
    source: z.string().optional(),
    elements: z.array(z.object({ type: z.string(), text: z.string().optional() }).passthrough()),
    appState: z.record(z.unknown()).optional(),
    files: z.record(z.unknown()).optional(),
  })
  .passthrough();

function getTextElements(scene: SceneLike): string[] {
  const elements = Array.isArray(scene.elements) ? (scene.elements as SceneElement[]) : [];
  return elements
    .filter((element) => element.type === "text" && typeof element.text === "string")
    .map((element) => element.text as string);
}

const architectureDocCandidates = [
  "README.md",
  "docs/introduction/development.mdx",
  "docs/codebase/frames.mdx",
  "docs/codebase/json-schema.mdx",
  "docs/@excalidraw/mermaid-to-excalidraw/development.mdx",
  "docs/@excalidraw/mermaid-to-excalidraw/codebase/codebase.mdx",
];

async function collectMarkdownFiles(dirPath: string): Promise<string[]> {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const nestedLists = await Promise.all(
    entries.map(async (entry) => {
      const absolute = resolve(dirPath, entry.name);
      if (entry.isDirectory()) {
        return collectMarkdownFiles(absolute);
      }
      if (entry.isFile()) {
        const extension = extname(entry.name).toLowerCase();
        if (extension === ".md" || extension === ".mdx") {
          return [absolute];
        }
      }
      return [];
    }),
  );
  return nestedLists.flat();
}

async function buildArchitectureResourceText(): Promise<string> {
  const docsRoot = resolveWithinRepo("dev-docs");
  const docsExists = await isDirectory(docsRoot);
  if (!docsExists) {
    return "# Excalidraw architecture\n\n`dev-docs/` directory was not found.";
  }

  const allDocs = await collectMarkdownFiles(docsRoot);
  const allDocsRelative = allDocs
    .map((file) => toRepoRelative(file))
    .sort((left, right) => left.localeCompare(right));

  const loadedSections: Array<{ path: string; text: string }> = [];
  for (const relativePath of architectureDocCandidates) {
    const absolutePath = resolve(docsRoot, relativePath);
    const fileStats = await stat(absolutePath).catch(() => null);
    if (!fileStats?.isFile()) {
      continue;
    }
    const content = await readFile(absolutePath, "utf8");
    loadedSections.push({
      path: toRepoRelative(absolutePath),
      text: content,
    });
  }

  const indexLines = allDocsRelative.map((entry) => `- \`${entry}\``).join("\n");
  const sectionBlocks = loadedSections
    .map((section) => `## ${section.path}\n\n${section.text}`)
    .join("\n\n---\n\n");

  const sectionContent = sectionBlocks
    ? sectionBlocks
    : "_No architecture-focused files were found in the expected paths._";

  return [
    "# Excalidraw Architecture Docs",
    "",
    "Source directory: `dev-docs/`",
    "",
    "## Index of Markdown files",
    "",
    indexLines || "_No markdown files found._",
    "",
    "## Selected architecture content",
    "",
    sectionContent,
  ].join("\n");
}

const server = new McpServer({
  name: "excalidraw-scenes",
  version: "0.1.0",
});

server.registerTool(
  "list_scenes",
  {
    title: "List Excalidraw scenes",
    description:
      "List .excalidraw files under a directory (path is relative to the repo root). Returns one path per line.",
    inputSchema: {
      dir: z
        .string()
        .describe("Directory to scan, e.g. 'examples' or 'excalidraw-app/data'"),
    },
  },
  async ({ dir }) => {
    try {
      const root = resolveWithinRepo(dir);
      if (!(await isDirectory(root))) {
        return {
          content: [
            {
              type: "text",
              text: `Directory not found: ${dir} (resolved: ${root})`,
            },
          ],
          isError: true,
        };
      }

      const scenes = (await collectSceneFilesRecursively(root))
        .map((path) => toRepoRelative(path))
        .sort((left, right) => left.localeCompare(right));

      return {
        content: [
          {
            type: "text",
            text: scenes.length ? scenes.join("\n") : `(no .excalidraw files under ${dir})`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: error instanceof Error ? error.message : "Unknown error",
          },
        ],
        isError: true,
      };
    }
  },
);

server.registerTool(
  "read_scene",
  {
    title: "Read Excalidraw scene",
    description:
      "Return the parsed JSON of an .excalidraw file as a pretty-printed string.",
    inputSchema: {
      path: z.string().describe("Path to a .excalidraw file"),
    },
  },
  async ({ path }) => {
    try {
      const filePath = resolveWithinRepo(path);
      const raw = await readFile(filePath, "utf8");
      const parsed = parseSceneJson(raw);
      return {
        content: [{ type: "text", text: JSON.stringify(parsed, null, 2) }],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: error instanceof Error ? error.message : "Unknown error",
          },
        ],
        isError: true,
      };
    }
  },
);

server.registerTool(
  "validate_scene",
  {
    title: "Validate Excalidraw scene JSON",
    description:
      "Validate Excalidraw JSON using Zod. Returns valid flag, diagnostics, and a short summary.",
    inputSchema: {
      json: z.string().describe("Raw JSON string to validate"),
    },
  },
  async ({ json }) => {
    try {
      const parsed = JSON.parse(json) as unknown;
      const result = sceneValidationSchema.safeParse(parsed);

      if (!result.success) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  valid: false,
                  issues: result.error.issues.map((issue) => ({
                    path: issue.path.join("."),
                    message: issue.message,
                    code: issue.code,
                  })),
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      const validated = result.data;
      const elements = validated.elements;
      const textCount = elements.filter((element) => element.type === "text").length;

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                valid: true,
                summary: {
                  type: validated.type ?? null,
                  version: validated.version ?? null,
                  source: validated.source ?? null,
                  elementCount: elements.length,
                  textElementCount: textCount,
                },
              },
              null,
              2,
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: error instanceof Error ? error.message : "Unknown error",
          },
        ],
        isError: true,
      };
    }
  },
);

server.registerTool(
  "extract_text",
  {
    title: "Extract text from scene",
    description:
      "Return every string from text elements inside a .excalidraw file, one per line.",
    inputSchema: {
      path: z.string().describe("Path to a .excalidraw file"),
    },
  },
  async ({ path }) => {
    try {
      const filePath = resolveWithinRepo(path);
      const raw = await readFile(filePath, "utf8");
      const scene = parseSceneJson(raw);
      const texts = getTextElements(scene);
      return {
        content: [{ type: "text", text: texts.length ? texts.join("\n") : "(no text)" }],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: error instanceof Error ? error.message : "Unknown error",
          },
        ],
        isError: true,
      };
    }
  },
);

server.registerResource(
  "architecture-docs",
  "excalidraw://docs/architecture",
  {
    title: "Excalidraw architecture docs",
    description: "Architecture-focused documentation exposed from dev-docs/.",
    mimeType: "text/markdown",
  },
  async (uri) => ({
    contents: [
      {
        uri: uri.href,
        mimeType: "text/markdown",
        text: await buildArchitectureResourceText(),
      },
    ],
  }),
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("excalidraw-scenes MCP listening on stdio");
