# dsh-zh-thinking

让 DeepSeek Harness 里的模型用中文思考（reasoning 通道），而不只是用中文回答。

## 问题

模型思考走 reasoning 通道，内容由模型自己生成，请求发出后无法中途干预。是否用中文思考取决于两点：

1. 请求里有没有明确指向 reasoning 通道的中文要求；
2. 这条要求离生成点有多近。

会话变长之后，历史里堆满英文源码、英文工具输出和英文命令行，位于系统提示开头的一句话会被稀释。

## 注入位置

同一段要求在四个位置各注册一次：

| 注册 | 类型 | order | 位置 |
|---|---|---|---|
| `zh-thinking-head` | section | -90 | 系统提示第一行 |
| `zh-thinking-tail` | section | 10250 | 系统提示最后一行 |
| `zh-thinking-reminder` | context | 95 | 运行时快照第一行 |
| `zh-thinking-reminder-tail` | context | 140 | 运行时快照最后一行 |

后两条决定效果。运行时快照是 harness 在每次模型请求前重新生成的消息，固定排在 messages 末尾；旧快照被替换而不是累积。放在快照内部，提醒就贴着生成点，且每步重写、不随会话变长而增长。

## 实测

### 有无提醒

英文技术历史约 5k 字符、中文任务，reasoning 中文占比（0 = 全英文，1 = 全中文）：

| 模型 | 无提醒 | 有提醒 |
|---|---|---|
| deepseek-v4.1-flash-1017 | 0.25 | **0.95** |
| qwen3.8-max | 0.24 | **0.86** |
| qwen3.6-flash | 0.39 | 0.50 |
| glm-5.3（149k 字符英文历史） | — | **0.93** |

效果因模型而异。模型自身的推理习惯来自训练，提示词只能影响、不能保证。把推理写成固定英文小标题的模型（例如 `Here's a thinking process: 1. Analyze User Input:`），收效有限。

### 提醒份数

运行时快照尾部重复 1 / 2 / 3 份，149k 字符英文历史，每档 2 次：

| 模型 | 1 份 | 2 份 | 3 份 |
|---|---|---|---|
| deepseek-v4.1-flash-1017 | 0.94 | 0.90 | 0.92 |
| glm-5.3 | 0.93 | 0.87 | 0.91 |

三档没有可测差异：同档两次运行的波动为 ±0.02，档间差比波动还小，方向也不一致。重复只在极长会话中有效（英文历史达 120k 字符时，一份 0.37，五份 0.56），日常会话不值得为此每步多花约 160 token。因此固定一份。

## 成本

每步约增加 186 个输入 token（四段文本共 344 字符）。系统提示中的两句会被缓存命中，快照中的两段按未命中计算。

## 设置

插件声明一个设置项，宿主为其生成表单（命名空间 `zh-thinking`）：

| 字段 | 类型 | 默认 | 作用 |
|---|---|---|---|
| `enabled` | 开关 | 开 | 关闭后四条注册全部撤销，等同于未安装，条目仍留在 profile 中 |

修改无需重启：宿主重新加载条目后，下一次请求即按新值组装。

## 安装

### 从 npm

```bash
dsh plugin --profile desktop add dsh-zh-thinking
```

前提是该包已发布到 npm registry，且 profile 的 `package.json` 中 `dsh.profile.bundles` 包含它（`dsh plugin add` 会自动添加）。

### 本地开发

```bash
cd ~/.dsh/profiles/desktop
pnpm add file:/path/to/dsh-zh-thinking
```

随后把 `dsh-zh-thinking` 加入 profile `package.json` 的 `dsh.profile.bundles`。包内的 `cordis.patch.yml`（由 `dsh.bundle.patch` 声明）负责把插件条目插入加载器，无需手工修改 profile 的 patch。

## 卸载

```bash
dsh plugin --profile desktop remove dsh-zh-thinking
```

或从 `dsh.profile.bundles` 中删除该条目，并执行 `pnpm remove dsh-zh-thinking`。

## 已知边界

- 单次 completion 内部无法注入文本，每步提醒一次已是可达到的最高频率。
- 提醒是偏好而非开关：英文材料极多时仍可能中途漂移，重启 DSH 或新开会话可重置。
- 更换模型会改变效果，见实测表。