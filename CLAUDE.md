# CLAUDE.md

本文件为 Claude Code(claude.ai/code)在本仓库中工作时提供指导说明。

## 这个仓库是什么

这是一个 Week 5「A/B 提示词结构化」练习,围绕同一个单文件咖啡配送 HTML 小游戏,用两种不同方式修改而成:

- **`A/`** — 用非结构化、随口聊天的方式提出修改请求(没有 `CLAUDE.md`,没有固定的提示词格式)。
- **`B/`** — 同一个起点的游戏,用结构化的提示词修改而成(五段式格式 `[현재 상황]/[목표]/[구체적인 변경]/[유지할 것]/[완료 기준]`,报 bug 时用 `[문제 재현]/[실제 결과]/[기대 결과]/[수정 범위]` 格式),由 **`B/CLAUDE.md`** 这份单独、范围更窄的系统提示词来约束,该规则只在 `B/` 内部生效。

`B` 是接着 `A` 的结果继续开发的,不是独立开发的。两个文件夹的结构被刻意设计成平行对照:文件布局相同(`index.html`、`tests/game.test.cjs`、`README.md`、`WORKSHEET.md`、`.gitignore`),只有游戏代码本身和 `WORKSHEET.md` 的内容不同。

仓库根目录下还有一些用来记录和展示这次对比的文件,它们不是游戏代码:
- `WEEK5_LOG.md` — 填写完成的实习记录表(韩语),对比 A 和 B,其中有专门的「A/B 프롬프트 비교」部分,列出 8 组并排对照案例。
- `B_PROMPTS.md` — B 会话中用户发送的每一条提示词,按时间顺序从本地 Claude Code 对话记录中提取而来。
- `presentation.html` + `PRESENTATION_SCRIPT.md` — 一份 7 页、可用方向键翻页的发表用幻灯片,以及对应的韩语/中文讲稿,内容只依据 `WEEK5_LOG.md`/`B_PROMPTS.md` 里已有的事实撰写。
- `screenshots/` — `WORKSHEET.md`/`WEEK5_LOG.md` 和 `presentation.html` 通过相对路径引用的截图;文件名带 `A_`/`B_` 前缀的是同角度并排对比图。

这个根目录本身不是一个 git 仓库。这项作业发布的版本放在 GitHub 的 `coffee-delivery-game-week3` 仓库里,在那里 **B 的 `index.html`/`tests/` 成为仓库根目录的内容**,`WORKSHEET.md` 被替换成 `WEEK5_LOG.md` 的内容,另外还加入了 `A/index.html`、`B_PROMPTS.md`、`screenshots/`——所以在处理已发布的仓库结构时,B 才是「标准版本」,不是 A。

## 常用命令

`A/` 和 `B/` 各自都是独立的、可用 Node 测试的项目(无需构建、无依赖):

```sh
# 在 A/ 或 B/ 目录下执行
node --test tests/game.test.cjs
```

游戏本身不需要安装、服务器或 API key——直接用浏览器打开 `index.html` 即可运行。没有配置 lint/格式化工具。

## 架构说明(`A/index.html` 和 `B/index.html` 结构完全相同)

每个 `index.html` 都是单个文件,内联 `<style>`/`<script>` 实现了一个小型伪 3D 小镇模拟——没有外部库,没有构建流程。关键函数(A、B 中函数名相同,内部逻辑不同):

- `SITES` — 咖啡店和村庄建筑的静态数据(位置、名称)。
- `newGame()` — 构建初始游戏状态对象(位置、朝向、携带物品、关卡、经济/升级、特效、送货路线)。
- `interact(s)` — 处理在咖啡店取货、向邻居送货。
- `step(s, dt, input)` — 每帧的移动、碰撞和计时处理。
- `draw(c, s, opts)` — 把场景渲染到 canvas 上。
- `mount(canvas, onUpdate)` — 连接键盘/按钮输入和渲染循环。

因为 `B/CLAUDE.md` 规定「只改请求的部分,index.html 保持单文件,不加新库/CDN/构建步骤」,所以 B 的修改都是在这套结构内做加法,而不是架构重写——新功能(送货顺序路线、咖啡店扩张外观、碰撞、建筑装饰、菜单/推车物品)都是叠加进 `SITES`/`newGame`/`interact`/`step`/`draw` 里,而不是新建文件或模块。

## 在 `A/` 和 `B/` 中工作时注意

- 把 `A/` 当作一个冻结的基线——它代表的是「非结构化提示词产出的结果」这个样本,被 `WEEK5_LOG.md` 的对比部分引用;不要为了对齐 B 而更新它。
- 修改 `B/index.html` 时,`B/CLAUDE.md` 是权威的指令集(单文件约束、不做未要求的修改、每次修改后要汇报 `[변경한 점 / 직접 확인한 것 / 미확인]`、优先用 `node --test tests/game.test.cjs` 作为完成的证据)。修改前请先读它。
- `WORKSHEET.md`/`WEEK5_LOG.md` 里引用的截图使用的是相对于该文件自身位置的路径——新增截图时,把它们放在仓库根目录的 `screenshots/` 下(如果 `A/`/`B/` 内部的 worksheet 引用的是本地截图,则放在对应目录下)。
