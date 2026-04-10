import type { Lead, TimelineEntry, Project, DayType } from '../types';
import { getCalendarDaysAgoText, DAY_TYPE_LABELS } from '../types';

// ─── Claude Client ───

const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY || '';

export const isAIConfigured = () => Boolean(apiKey);

// ─── System Prompt ───

const SYSTEM_PROMPT = `You are an AI assistant for a Malaysian real estate Advisor (not an agent/salesperson).
You help the advisor communicate effectively with property buyers.

ROLE:
- Position: Not a pusher. A consultant who helps clients make the best property decision.
- Perspective: Always think from the client's point of view, not the seller's.
- Tone: Professional but not cold. Like a knowledgeable friend giving advice.
- Never say "买/buy" - say "拥有/own", "入手/secure", "锁定/lock in".
- Never say "卖给你/sell to you" - say "帮你分析/help you analyze", "帮你争取/help you negotiate".

LANGUAGE RULES:
- Auto-detect customer language and match it.
- Chinese (华语): Malaysian colloquial style. Use "你" not "您". Casual, local, 道地.
- English: Native casual. No formal business English.
- Malay: Use abbreviations and slang (xpe, dtg, blh, mcm mane, utk, boss, kakak).
- Style: WhatsApp chat, NOT email. NOT formal. NOT official.

6 COMMUNICATION PRINCIPLES:
1. State facts objectively. Never blame or pressure.
2. Proactively offer an exit. Show subtle vulnerability.
3. Set boundaries. Demonstrate professional follow-through.
4. Minimize pressure. Cut risk for the client.
5. Self-reflect rather than blame externally.
6. Use emotional leverage, not hard selling.

ALTRUISTIC THINKING:
- Never talk about how good the product specs are.
- Talk about what pain points it solves for the client.
- Lead with the conclusion - first sentence shows core benefit.

CORE SALES PHILOSOPHY:
- NEVER directly ask "你做决定了吗？" / "have you decided?" / "考虑得怎样？"
- Client not replying = they haven't found a compelling reason yet.
- Help clients discover their own pain points and timing.
- Every follow-up must provide NEW value (new info, new angle, new calculation).
- Never repeat the same question.
- Sales is not one conversation, it's continuous trust-building.
- Many deals close on the 5th-7th follow-up.

OUTPUT RULES:
- Short! Short! Short! Like a friend sending WhatsApp.
- Replies: 1-3 sentences, max 3 lines.
- Sending materials: Max 5 sentences, highlight key points.
- Always end with a question (encourage reply).
- Max 1-2 emojis.
- FORBIDDEN: Long essays, official tone, textbook-style replies.
- FORBIDDEN: "尊敬的客户", "Dear customer", "Thank you for your inquiry" type phrases.
- Tone should be as natural as chatting with a friend.`;

// ─── Generic Caller (using fetch for browser compatibility) ───

async function callClaude(userPrompt: string): Promise<string> {
  if (!isAIConfigured()) throw new Error('Claude API key not configured');

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const msg = (err as Record<string, Record<string, string>>)?.error?.message || response.statusText;
      if (response.status === 429) throw new Error('AI 配额已用完，请稍后再试');
      throw new Error(`AI 请求失败: ${msg}`);
    }

    const data = await response.json() as { content: Array<{ type: string; text: string }> };
    const text = data.content?.find((c) => c.type === 'text')?.text || '';
    return text.trim();
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('AI')) throw err;
    console.error('Claude API error:', err);
    throw new Error('AI 请求失败，请稍后再试');
  }
}

// ─── Multimodal Caller (for images) ───

async function callClaudeWithImage(userPrompt: string, imageBase64: string, mimeType: string): Promise<string> {
  if (!isAIConfigured()) throw new Error('Claude API key not configured');

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mimeType, data: imageBase64 } },
            { type: 'text', text: userPrompt },
          ],
        }],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const msg = (err as Record<string, Record<string, string>>)?.error?.message || response.statusText;
      throw new Error(`AI 请求失败: ${msg}`);
    }

    const data = await response.json() as { content: Array<{ type: string; text: string }> };
    const text = data.content?.find((c) => c.type === 'text')?.text || '';
    return text.trim();
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('AI')) throw err;
    console.error('Claude API error:', err);
    throw new Error('AI 请求失败，请稍后再试');
  }
}

// ─── Context Builders ───

function buildLeadContext(lead: Lead, event?: { name: string } | null, project?: Project | null): string {
  const parts = [
    `客户: ${lead.name}`,
    `电话: ${lead.phone}`,
    `状态: ${lead.status}`,
    `录入时间: ${getCalendarDaysAgoText(lead.createdAt)}`,
  ];
  if (event) parts.push(`来源活动: ${event.name}`);
  if (project) {
    parts.push(`意向项目: ${project.name}`);
    if (project.description) parts.push(`项目简介: ${project.description}`);
    if (project.sellingPoints.length > 0) parts.push(`卖点: ${project.sellingPoints.join(', ')}`);
  } else if (lead.projectInterest) {
    parts.push(`意向项目: ${lead.projectInterest}`);
  }
  if (lead.notes) parts.push(`备注: ${lead.notes}`);
  if (lead.tags.length > 0) parts.push(`标签: ${lead.tags.join(', ')}`);
  return parts.join('\n');
}

function buildTimelineContext(timeline: TimelineEntry[], limit = 5): string {
  if (timeline.length === 0) return '暂无互动记录';
  return timeline
    .slice(0, limit)
    .map((t) => `[${t.type}] ${t.content} (${getCalendarDaysAgoText(t.createdAt)})`)
    .join('\n');
}

// ─── Feature 1: AI Reply Suggestions ───

export interface ReplySuggestion {
  style: string;
  message: string;
}

export async function generateReplySuggestions(
  customerReply: string,
  lead: Lead,
  timeline: TimelineEntry[],
  event?: { name: string } | null,
  project?: Project | null,
): Promise<ReplySuggestion[]> {
  const prompt = `客户回复了以下消息，请帮我生成 3 个不同风格的回复选项。

客户回复内容:
"${customerReply}"

客户资料:
${buildLeadContext(lead, event, project)}

最近互动记录:
${buildTimelineContext(timeline)}

请自动判断这是普通回复还是异议（太贵、不急、在看竞品等），并给出对应的回复策略。

请严格按以下 JSON 格式返回，不要有任何多余文字:
[
  {"style": "温和型", "message": "回复内容"},
  {"style": "引导型", "message": "回复内容"},
  {"style": "直接型", "message": "回复内容"}
]`;

  const result = await callClaude(prompt);
  try {
    const cleaned = result.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return [{ style: 'AI 建议', message: result }];
  }
}

// ─── Feature 2: AI Message Generation ───

export async function generateMessage(
  lead: Lead,
  dayType: DayType,
  timeline: TimelineEntry[],
  event?: { name: string } | null,
  project?: Project | null,
): Promise<string> {
  const prompt = `帮我生成一条 WhatsApp 消息给这个客户。

当前跟进阶段: ${DAY_TYPE_LABELS[dayType]}

客户资料:
${buildLeadContext(lead, event, project)}

最近互动记录:
${buildTimelineContext(timeline)}

要求:
- 根据当前跟进阶段生成合适的内容
- Day 0: 自我介绍 + 项目亮点
- Day 1: 一个卖点 + 引导提问
- Day 3: 提供新价值/新角度 + Call to Action
- Day 7: 最后跟进，给台阶，不施压
- 必须用客户的语言（根据名字和之前互动判断）
- 直接返回消息内容，不要有任何解释或前缀`;

  return callClaude(prompt);
}

// ─── Feature 3: AI Daily Summary ───

export async function generateDailySummary(
  leads: Lead[],
  timeline: TimelineEntry[],
  projects: Project[],
): Promise<string> {
  const leadsInfo = leads.map((l) => {
    const project = projects.find((p) => p.id === l.projectId);
    const leadTimeline = timeline.filter((t) => t.leadId === l.id).slice(0, 3);
    return `- ${l.name} (${l.status}, ${getCalendarDaysAgoText(l.createdAt)}, 项目: ${project?.name || l.projectInterest || '未指定'}, 标签: ${l.tags.join(',') || '无'})${leadTimeline.length > 0 ? ' 最近: ' + leadTimeline[0].content : ''}`;
  }).join('\n');

  const prompt = `以下是今天需要跟进的客户列表，请给我一个简短的今日总结和行动建议。

今日待跟进客户:
${leadsInfo}

要求:
- 用 3-5 句话总结今日重点
- 指出哪个客户应该优先处理，为什么
- 给出具体的行动建议
- 不要啰嗦，像同事给你的简报
- 直接返回总结内容，不要有任何前缀`;

  return callClaude(prompt);
}

// ─── Feature 4: AI Intent Analysis ───

export interface IntentResult {
  leadId: string;
  intent: 'hot' | 'warm' | 'cold';
  reason: string;
}

export async function analyzeIntent(
  leads: Lead[],
  timeline: TimelineEntry[],
): Promise<IntentResult[]> {
  if (leads.length === 0) return [];

  const leadsInfo = leads.map((l) => {
    const leadTimeline = timeline.filter((t) => t.leadId === l.id);
    const recentActivity = leadTimeline.slice(0, 3).map((t) => `${t.type}: ${t.content}`).join('; ');
    return `ID:${l.id} | ${l.name} | 状态:${l.status} | 标签:${l.tags.join(',') || '无'} | 录入:${getCalendarDaysAgoText(l.createdAt)} | 互动:${recentActivity || '无'}`;
  }).join('\n');

  const prompt = `分析以下客户的购买意向，判断 hot/warm/cold。

客户列表:
${leadsInfo}

请严格按以下 JSON 格式返回，不要有任何多余文字:
[
  {"leadId": "客户ID", "intent": "hot/warm/cold", "reason": "简短原因"}
]`;

  const result = await callClaude(prompt);
  try {
    const cleaned = result.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return [];
  }
}

// ─── Feature 5: AI Follow-up Topic Suggestions ───

export interface FollowUpSuggestion {
  leadId: string;
  suggestion: string;
}

export async function suggestFollowUpTopics(
  leads: Lead[],
  timeline: TimelineEntry[],
  projects: Project[],
): Promise<FollowUpSuggestion[]> {
  if (leads.length === 0) return [];

  const leadsInfo = leads.map((l) => {
    const project = projects.find((p) => p.id === l.projectId);
    const leadTimeline = timeline.filter((t) => t.leadId === l.id).slice(0, 3);
    const recentActivity = leadTimeline.map((t) => `${t.type}: ${t.content}`).join('; ');
    return `ID:${l.id} | ${l.name} | 项目:${project?.name || l.projectInterest || '未指定'} | 备注:${l.notes || '无'} | 标签:${l.tags.join(',') || '无'} | 互动:${recentActivity || '无'}`;
  }).join('\n');

  const prompt = `为以下客户各生成一句跟进话题建议。

客户列表:
${leadsInfo}

要求:
- 根据客户的备注、标签、互动记录找到切入点
- 每个建议不超过 20 个字
- 要具体，不要泛泛的「问问需求」

请严格按以下 JSON 格式返回，不要有任何多余文字:
[
  {"leadId": "客户ID", "suggestion": "跟进话题建议"}
]`;

  const result = await callClaude(prompt);
  try {
    const cleaned = result.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return [];
  }
}

// ─── Feature 6: AI Auto Tags ───

export async function suggestTags(
  lead: Lead,
  timeline: TimelineEntry[],
  event?: { name: string } | null,
  project?: Project | null,
): Promise<string[]> {
  const prompt = `根据以下客户资料，建议 2-3 个最合适的标签。

客户资料:
${buildLeadContext(lead, event, project)}

最近互动记录:
${buildTimelineContext(timeline)}

可选标签: 投资客, 自住, 高预算, 低预算, 急买, 犹豫中, 外州客, 首购族, 升级换房, 回头客

也可以建议不在列表中的新标签。
当前已有标签: ${lead.tags.join(', ') || '无'}

请严格按以下 JSON 格式返回，不要有任何多余文字:
["标签1", "标签2", "标签3"]`;

  const result = await callClaude(prompt);
  try {
    const cleaned = result.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    const tags = JSON.parse(cleaned) as string[];
    return tags.filter((t) => !lead.tags.includes(t));
  } catch {
    return [];
  }
}

// ─── Feature 7: AI Brochure Analysis ───

export async function analyzeBrochure(file: File): Promise<string[]> {
  if (!isAIConfigured()) throw new Error('Claude API key not configured');

  const bytes = await file.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(bytes)));
  const mimeType = file.type || 'image/jpeg';

  const prompt = `分析这个房地产项目的 Sales Kit / Brochure，提取卖点。

要求:
- 用利他思维重新包装每个卖点（不讲产品多好，讲能帮客户解决什么）
- 每个卖点一句话，简洁有力
- 提取 5-8 个卖点
- 用中文

请严格按以下 JSON 格式返回，不要有任何多余文字:
["卖点1", "卖点2", "卖点3"]`;

  const result = await callClaudeWithImage(prompt, base64, mimeType);
  try {
    const cleaned = result.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return [result];
  }
}
