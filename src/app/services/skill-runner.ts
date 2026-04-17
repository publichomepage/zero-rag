/**
 * Skill Runner — loads skill definitions from .skill.md files
 * and executes them based on LLM tool-call output.
 * 
 * Architecture (inspired by OpenClaw agents):
 * 1. Skills are defined declaratively in markdown files
 * 2. The runner builds a system prompt listing available skills
 * 3. The LLM outputs JSON to invoke a skill
 * 4. The runner executes the skill (makes the API call)
 * 5. Returns formatted result
 */

// Skill definition parsed from .skill.md
export interface Skill {
  name: string;
  description: string;
  arguments: { name: string; type: string; description: string }[];
  api: { endpoint: string; method: string };
  responseMapping: Record<string, string>;
}

// Dynamic skill registry
export const SKILLS: Skill[] = [];

/**
 * Parses a skill defined in markdown format.
 */
export function parseSkillMarkdown(md: string): Skill {
  const skill: Partial<Skill> = { arguments: [], responseMapping: {}, api: { endpoint: '', method: '' } };

  const nameMatch = md.match(/name:\s*(.+)/);
  const descMatch = md.match(/description:\s*(.+)/);
  if (nameMatch) skill.name = nameMatch[1].trim();
  if (descMatch) skill.description = descMatch[1].trim();

  const argsSection = md.match(/## Arguments([\s\S]*?)##/);
  if (argsSection) {
    const argLines = argsSection[1].split('\n').filter(l => l.trim().startsWith('-'));
    for (const line of argLines) {
      const match = line.match(/-\s*(\w+):\s*(\w+)\s*\((.*)\)/);
      if (match) {
        skill.arguments!.push({ name: match[1], type: match[2], description: match[3] });
      }
    }
  }

  const apiSection = md.match(/## API([\s\S]*?)##/);
  if (apiSection) {
    const endpointMatch = apiSection[1].match(/Endpoint:\s*(.+)/);
    const methodMatch = apiSection[1].match(/Method:\s*(.+)/);
    if (endpointMatch) skill.api!.endpoint = endpointMatch[1].trim();
    if (methodMatch) skill.api!.method = methodMatch[1].trim();
  }

  const mapSection = md.match(/## Response Mapping([\s\S]*)$/);
  if (mapSection) {
    const mapLines = mapSection[1].split('\n').filter(l => l.trim().includes(':'));
    for (const line of mapLines) {
      const [key, val] = line.split(':').map(s => s.trim());
      if (key && val) {
        skill.responseMapping![key] = val;
      }
    }
  }

  return skill as Skill;
}

/**
 * Fetches and loads skill definitions into the registry.
 */
export async function loadSkillsFromUrls(urls: string[]): Promise<void> {
  SKILLS.length = 0; // Clear existing
  for (const url of urls) {
    try {
      const res = await fetch(url);
      const text = await res.text();
      const parsed = parseSkillMarkdown(text);
      if (parsed.name) {
        SKILLS.push(parsed);
        console.log(`✅ Loaded skill: ${parsed.name}`);
      }
    } catch (e) {
      console.error(`❌ Failed to load skill from ${url}`, e);
    }
  }
}

/**
 * Build a system prompt that tells the LLM about all available skills.
 */
export function buildSkillPrompt(isLlama: boolean = false): string {
  const skillDescriptions = SKILLS.map(skill => {
    const args = skill.arguments.map(a => `  - ${a.name}: ${a.type} (${a.description})`).join('\n');
    return `Skill: ${skill.name}\nDescription: ${skill.description}\nArguments:\n${args}`;
  }).join('\n\n');

  if (isLlama || true) {
    return `You are a function-calling coordinator. You have access to the following skills:

${skillDescriptions}

RULES:
1. If the user's request matches a skill, output ONLY the JSON for that skill.
2. If the request is a general question or doesn't match a skill, output ONLY: {"skill": "none"}
3. DO NOT answer the user's question yourself. 
4. DO NOT provide any text other than the JSON object.`;
  }
}

/**
 * Parse LLM output to extract a skill invocation.
 */
export function parseSkillCall(content: string): { skill: string; arguments: Record<string, string> } | null {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.skill && parsed.skill !== 'none' && parsed.skill.trim().length > 0) {
        return { skill: parsed.skill, arguments: parsed.arguments || {} };
      }
    }
  } catch {
    // Not valid JSON
  }
  return null;
}

/**
 * Execute a skill by name with the given arguments.
 * Makes the actual API call and extracts the response.
 */
export async function executeSkill(
  skillName: string,
  args: Record<string, string>
): Promise<{ success: boolean; data?: Record<string, any>; error?: string }> {
  // Enforce exact match to prevent small models from hallucinating false positives
  const skill = SKILLS.find(s => s.name.toLowerCase() === skillName.toLowerCase());

  if (!skill) {
    return { success: false, error: `Unknown skill: ${skillName}. Available: ${SKILLS.map(s => s.name).join(', ')}` };
  }

  // Build the URL by replacing {arg} placeholders
  let url = skill.api.endpoint;
  for (const [key, value] of Object.entries(args)) {
    url = url.replace(`{${key}}`, encodeURIComponent(value));
  }

  console.log(`🔧 Executing skill "${skillName}" → ${url}`);

  try {
    const res = await fetch(url);
    const json = await res.json();

    // Extract mapped fields from the response
    const data: Record<string, any> = {};
    for (const [key, path] of Object.entries(skill.responseMapping)) {
      data[key] = resolvePath(json, path);
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Resolve a dot/bracket path like "current_condition[0].temp_C" on an object.
 */
function resolvePath(obj: any, path: string): any {
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
  let current = obj;
  for (const part of parts) {
    if (current == null) return undefined;
    current = current[part];
  }
  return current;
}

/**
 * Run the full skill pipeline: LLM → parse → execute → format result.
 */
export async function runSkillAgent(engine: any, userMessage: string, isLlama: boolean = false): Promise<{ wasSkillUsed: boolean, result: string }> {
  if (!engine) return { wasSkillUsed: false, result: 'LLM Engine not loaded.' };

  const messages = [
    { role: 'system', content: buildSkillPrompt(isLlama) },
    { role: 'user', content: userMessage },
  ];

  // Step 1: Ask LLM which skill to use
  const response = await engine.chat.completions.create({
    messages,
    temperature: isLlama ? 0.0 : 0.1,
    max_tokens: 150,
  });

  const usage = response.usage;
  if (usage) {
    console.log(`📊 Token Usage - Prompt: ${usage.prompt_tokens}, Completion: ${usage.completion_tokens}, Total: ${usage.total_tokens}`);
  }

  const content = response.choices[0]?.message?.content?.trim() || '';
  console.log('🤖 LLM Skill Response:', content);

  // Step 2: Parse the skill call
  const skillCall = parseSkillCall(content);
  if (!skillCall) {
    return { wasSkillUsed: false, result: '' };
  }

  // Step 3: Execute the skill
  const result = await executeSkill(skillCall.skill, skillCall.arguments);

  if (!result.success) {
    return { wasSkillUsed: true, result: `**❌ Skill failed:** ${result.error}` };
  }

  // Step 4: Format the result dynamically
  const skillName = skillCall.skill;
  const formattedLines = Object.entries(result.data!).map(([k, v]) => `**${k}**: ${v}`);
  const resultMarkdown = `**🔧 Skill executed: ${skillName}**\n\n${formattedLines.join('\n')}`;

  return {
    wasSkillUsed: true,
    result: resultMarkdown
  };
}
