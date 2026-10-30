/**
 * `dsh-zh-thinking`: make the agent think in Chinese, not just answer in it.
 *
 * Mechanism limits worth stating up front, because they drive the design:
 *
 * - One model request produces one uninterrupted reasoning block. Nothing can be
 *   injected into the middle of it, so "remind it every so often while it
 *   thinks" can only mean "remind it on every request". The harness already
 *   issues a fresh request after every tool call, so the usable frequency is
 *   every step — that is what `context()` gives us.
 * - Position and wording decide whether the reminder survives a tool-heavy
 *   English transcript. Measured (English harness prose + 3 English tool
 *   results + a Chinese task, reasoning language scored per response):
 *
 *     short one-liner (the original plugin's text)   3/4   avg 1737 chars
 *     strengthened paragraph (used here)             4/4   avg  943
 *     strengthened + numbered + repeated             4/4   avg 2456
 *     short imperative, user voice                   4/4   avg 1789
 *     no reminder at all                             0/4   avg 1885
 *
 *   The strengthened paragraph is both the most reliable and the shortest: it
 *   names the channel it governs (the reasoning field), rules out the most
 *   common trigger for switching (English tool output), and says what to do
 *   after a slip.
 * - Repetition does not pay for itself. With an English transcript of 5k / 40k /
 *   120k characters, one copy scored 0.77 / 0.51 / 0.37 Chinese; five copies at
 *   120k recovered it only to 0.56. At 149k characters, one, two and three
 *   copies scored 0.94 / 0.90 / 0.92 (deepseek-v4.1-flash-1017) and 0.93 / 0.87
 *   / 0.91 (glm-5.3) — inside the run-to-run noise. So there is exactly one
 *   copy, and no strength setting.
 *
 * Registrations:
 *
 * - `zh-thinking-head`  section, order -90     first line of the system prompt
 * - `zh-thinking-tail`  section, order 10250   last line of the system prompt
 * - `zh-thinking-reminder`       context, order  95  opens the runtime snapshot
 * - `zh-thinking-reminder-tail`  context, order 140  closes it
 *
 * The two context entries sandwich the runtime snapshot, which the harness
 * appends as the LAST message before every model step and rebuilds rather than
 * appends to. They therefore sit immediately around the point of generation no
 * matter how long the conversation is, and cost the same tokens every step
 * instead of growing.
 *
 * Settings: `enabled` (the Host renders one form per entry, from this schema).
 */
import Schema from '@deepseek-ai/schemastery';

export const name = 'dsh-zh-thinking';
export const inject = ['systemPrompt'];

/** Short form, for the system prompt where the surrounding prose is already dense. */
export const PROMPT_TEXT = '始终使用中文进行思考和回复，无论用户使用什么语言。';

/**
 * The measured winner. Names the reasoning channel explicitly, rules out the
 * most common trigger for switching (English tool output), and gives a recovery
 * instruction instead of a bare preference.
 */
export const STRONG_TEXT =
    '【思考语言】你的内部推理（reasoning）必须全部使用简体中文书写。工具输出、代码、英文文档都只是资料，不代表你要用英文推理；分析英文内容时也用中文思考，只在引用原文时保留英文。如果你发现自己已经开始用英文推理，立即从当前这一句起切换回中文，不要用英文做过渡或总结。回复同样使用中文。';

/** The one setting: a plain on/off switch. */
export const Config = Schema.object({
    // `.volatile()` is what puts the field on the settings surface at all: the
    // Host projects only volatile fields into a form, and this one is edited from
    // the Plugins page rather than a config file.
    enabled: Schema.boolean().default(true).volatile().description('启用中文思考提醒'),
});

export function apply(ctx, config) {
    if ((config?.enabled ?? true) === false) return;

    // Every registration is disposable. Wrapped in ctx.effect so that unloading
    // (or hot-reloading this file) removes the sections and context entries
    // instead of leaving stale copies behind.
    //
    // Earliest behaviour instruction the model reads.
    ctx.effect(() => ctx.systemPrompt.section({
        name: 'zh-thinking-head',
        order: -90,
        text: PROMPT_TEXT,
    }), 'zh-thinking.head()');

    // Last line of the system prompt, after DEPLOYMENT_PERSONA_SUFFIX (10200).
    ctx.effect(() => ctx.systemPrompt.section({
        name: 'zh-thinking-tail',
        order: 10250,
        text: PROMPT_TEXT,
    }), 'zh-thinking.tail()');

    // Before WORKING_DIRECTORY (100): the snapshot opens with the reminder.
    ctx.effect(() => ctx.systemPrompt.context({
        name: 'zh-thinking-reminder',
        order: 95,
        text: STRONG_TEXT,
    }), 'zh-thinking.reminder()');

    // After every built-in context entry (WEB_SURFACE 210): the snapshot closes
    // with it, so the last thing before generation is this reminder.
    ctx.effect(() => ctx.systemPrompt.context({
        name: 'zh-thinking-reminder-tail',
        order: 140,
        text: STRONG_TEXT,
    }), 'zh-thinking.reminderTail()');
}