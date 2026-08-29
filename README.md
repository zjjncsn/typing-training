# 打字练习

一个参考经典桌面打字软件训练体验制作的 Web 打字练习应用。项目使用 Vue 3 和 TypeScript 实现文字提示、输入反馈、虚拟键盘、手指指法与实时统计，并针对现代浏览器重新设计了界面与交互。

在线体验：[type.sci-tech.top](https://type.sci-tech.top)

## 已实现功能

- **英文键位练习（初级）**：按课程逐字符练习，虚拟键盘同步提示目标按键和对应手指。
- **英文键位练习（高级）**：按行展示训练内容，支持大小写、标点、错误反馈和退格修正。
- **数字键盘练习**：独立的数字小键盘布局、课程和右手指法提示。
- **单词练习**：提供常用词汇、考试词汇和专业词汇等 20 本词典，显示音标、词性和中文释义。
- **连续训练**：单词按整行排列，词间空格也需要输入；释义会跟随当前单词更新。
- **进度记忆**：浏览器会保存上次选择的词典和练习位置，再次进入时可接着练习。
- **即时反馈**：目标键、正确键和错误键使用不同状态显示；错误输入可用 Backspace 清除。
- **训练统计**：实时显示用时、速度、正确率和总体进度。
- **暂停控制**：按 Esc 暂停，按其他任意键继续；标签页失去焦点时自动暂停。

文章、拼音和五笔等训练模式尚在规划中。

## 技术栈

- Vue 3、TypeScript、Vite
- Vue Router、Pinia
- PrimeVue、PrimeIcons
- Node.js 内置测试运行器
- ESLint、oxlint、Prettier

## 本地运行

需要安装 Node.js `^22.18.0` 或 `>=24.12.0`，并使用 pnpm。

```sh
pnpm install
pnpm dev
```

常用命令：

```sh
pnpm test                 # 运行打字引擎和键位映射测试
pnpm type-check           # 运行 TypeScript / Vue 类型检查
pnpm build                # 类型检查并构建生产版本
pnpm preview              # 本地预览生产构建
pnpm lint                 # 运行 oxlint 和 ESLint 并自动修复
pnpm format               # 使用 Prettier 格式化 src/
pnpm content:migrate      # 重新生成键位课程数据
pnpm content:dictionaries # 重新生成前端词典数据
```

## 项目结构

```text
src/
├── content/                    # 课程清单、课程数据与类型
├── features/typing/
│   ├── components/             # 文本、键盘、手指、统计与选择面板
│   ├── composables/            # Vue 响应式训练逻辑
│   ├── dictionaries/           # 词典清单、类型与按需加载
│   ├── engine/                 # 纯函数会话状态机和统计逻辑
│   ├── keyboard/               # 标准键盘、数字键盘及指法映射
│   └── pages/                  # 键位练习与单词练习页面
├── router/                     # 应用路由
└── App.vue                     # PrimeVue 导航外壳

public/data/dictionaries/       # 构建时原样复制、运行时按需获取的词典
scripts/                        # 课程与词典数据生成脚本
tools/                          # 原始词典格式分析和提取工具
docs/                           # 原版窗体与词典格式研究记录
```

训练引擎、物理键位映射和视觉组件彼此分离。普通键位课程随应用构建；体积较大的词典不会打进 JavaScript 包，而是在用户进入单词练习并选择词典时按需下载。

## 主要页面

| 页面                 | 路由                                         |
| -------------------- | -------------------------------------------- |
| 英文键位练习（初级） | `/practice/english/keys/:lessonId?`          |
| 英文键位练习（高级） | `/practice/english/keys-advanced/:lessonId?` |
| 数字键盘练习         | `/practice/english/numpad/:lessonId?`        |
| 单词练习             | `/practice/english/words`                    |

## 部署

推送到 `main` 分支后，[GitHub Actions](.github/workflows/deploy-pages.yml) 会依次安装依赖、运行测试、构建项目并发布到 GitHub Pages。自定义域名由 [`public/CNAME`](public/CNAME) 配置为 `type.sci-tech.top`。

**本程序仅供学习交流使用，词库等部分如有侵权请联系删除。**
