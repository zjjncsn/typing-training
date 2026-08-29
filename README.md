# typing

金山打字通 2006 的 Web 复刻版：以 Vue 3 重做原版的打字训练体验，保留「文字、键盘、手指、统计」反馈闭环，不复刻桌面程序的固定布局。

原版程序与课程资源位于工作区的 `../jsdzt2006`，仅作本地分析和迁移参考，不随项目分发。

## 功能现状

- **英文基础键位训练**：课程驱动，逐字符反馈，虚拟键盘高亮目标键、显示手指分区，F/J 键带定位下划线
- **键位练习（高级）**：同一课程按行分段训练，整行文本提示与输入回显，区分大小写（CapsLock 状态指示），行尾按空格换行，支持退格回退（错误计数不回退）
- **数字键盘训练**：独立的数字小键盘指法课程与引导
- **训练统计**：时间、速度（CPM）、正确率、课程进度实时显示
- **暂停控制**：Esc 暂停、按任意键继续；切离页面自动暂停
- **导航外壳**：基于 PrimeVue 的应用框架，对应原版主窗体的功能入口

后续规划（见 [docs/reference-vb6-forms.md](docs/reference-vb6-forms.md)）：单词、文章、拼音、五笔等训练模式。

## 技术栈

Vue 3 · TypeScript · Vite · Pinia · Vue Router · PrimeVue
测试使用 Node 内置 test runner，代码规范使用 ESLint + oxlint + Prettier。

## 快速开始

要求 Node `^22.18.0` 或 `>=24.12.0`，包管理器为 pnpm。

```sh
pnpm install
pnpm dev       # 开发服务器
pnpm build     # 类型检查 + 生产构建
pnpm preview   # 预览构建产物
```

## 常用脚本

```sh
pnpm test              # 运行引擎与键位映射单元测试
pnpm type-check        # vue-tsc 类型检查
pnpm lint              # oxlint + eslint（自动修复）
pnpm format            # Prettier 格式化 src/
pnpm content:migrate   # 从原版资源迁移课程内容
```

## 项目结构

```text
src/
├── content/               # 课程数据（JSON）与类型
├── features/typing/
│   ├── engine/            # 纯函数打字引擎（会话状态机、统计）
│   ├── keyboard/          # QWERTY / 数字小键盘布局与手指映射
│   ├── components/        # 键盘、手指、统计、课程抽屉等组件
│   ├── composables/       # useTypingEngine（Vue 响应式封装）
│   └── pages/             # 训练页面
├── router/                # 路由（/practice/english/keys、/practice/english/numpad）
└── App.vue                # PrimeVue 导航外壳
```

架构原则：训练引擎、键位映射与视觉组件彼此解耦；练习与测试共享训练工作区，通过模式配置扩展，不为每种模式复制页面。

## 文档

- [docs/reference-vb6-forms.md](docs/reference-vb6-forms.md) — 从原版 exe 解析出的 VB6 窗体清单与 Web 组件映射，是功能迁移的设计依据
- [docs/ksearch-format-analysis.md](docs/ksearch-format-analysis.md) / [docs/ksearch-typelib.md](docs/ksearch-typelib.md) — 原版词典格式分析
- [docs/ksearch-dictionaries/](docs/ksearch-dictionaries/) — 从原版 `KSearch.dll` 提取的词典数据（约 20 本，含音标/词性/释义结构化标记），由 `tools/KSearchProbe` 工具生成
- [tools/](tools/) — 解析原版词典的 C# 提取工具

## 部署

GitHub Actions 工作流 [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) 自动构建并发布到 GitHub Pages。
