# 峡谷 AI 内容工作台

面向王者荣耀 AI 产品与内容团队的内部工作台 demo。项目用可控 Agent 流程模拟内容实习生的真实工作：输入赛事素材，Agent 自动拆解任务、检索英雄/赛事语料、生成多风格内容、做质量评估，并输出发布建议与模型迭代备忘。

## 功能

- 内部 dashboard 风格首屏，包含素材量、通过率、复核量、语料命中率。
- Agent 任务中心展示 5 步执行链路：任务解析、语料检索、内容生成、质量评估、迭代建议。
- `/api/agent` 使用 LangGraph 编排可控工作流。
- 使用 LangChain 的 `ChatOpenAI` 以 OpenAI-compatible 方式接入 DeepSeek。
- 未配置 API key 时自动使用 mock 输出，方便演示和部署预览。

## 技术栈

- Next.js App Router
- TypeScript
- Tailwind CSS
- LangChain / LangGraph
- DeepSeek `deepseek-v4-flash`

## 本地运行

```bash
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。

## 环境变量

复制 `.env.example` 为 `.env.local`，填入 DeepSeek key：

```env
DEEPSEEK_API_KEY=replace-with-your-deepseek-key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
```

不要把 `.env.local` 提交到 GitHub。

## 部署到 wangzhe.asta.net.cn

推荐用 Vercel 导入 GitHub 仓库 `wanfengrenzui/wangzhe-coding-demo`：

1. Vercel 新建项目并选择该仓库。
2. 添加环境变量 `DEEPSEEK_API_KEY`、`DEEPSEEK_BASE_URL`、`DEEPSEEK_MODEL`。
3. 在 Vercel 项目的 Domains 中绑定 `wangzhe.asta.net.cn`。
4. DNS 保持 CNAME：`wangzhe` -> `cname.vercel-dns.com`。

当前 demo 即使没有配置 DeepSeek key，也会展示完整 Agent 可视化链路。
