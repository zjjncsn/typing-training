# 金山打字通 2006：VB6 窗体解析记录

本文记录从 `jsdzt2006/金山打字通2006.exe` 直接解析得到的工程和窗体信息，作为 Web 版的信息架构、组件设计及后续功能迁移依据。

## 解析范围

解析链路：

```text
VBHeader
→ ProjectInfo
→ ObjectTable
→ ObjectInfo / OptionalObjectInfo
→ GUI Table / Control Array
```

已确认：

- VB6 工程名：`TypeEasy`
- 编译模式：Native Code
- GUI 窗体：39 个
- 工程对象：53 个
- 外部组件：8 个
- 主窗体：`Frm_Main`

对象表可以可靠恢复窗体名、控件实例名、控件索引、事件数量和窗体间的功能划分。窗体坐标和完整属性位于 VB6 私有属性流中；本项目不以旧版固定像素坐标作为 Web 布局依据。

## 完整窗体清单

### 应用入口与用户功能

- `Dlg_Splash`
- `Frm_Main`
- `DlgUr_UserLogin`
- `FrmUr_Manage`
- `DlgUr_IfBeginTest`
- `Frm_BeginTest`
- `DlgUr_BeginTestResult`
- `DlgHighScore`
- `Dlg_MessageBox`

### 英文训练

- `frmEn_KeyTrain_Basic`
- `frmEn_KeyTrain_Advanced`
- `frmEn_NumPad`
- `frmEn_WordTrain`
- `frmEn_ArticleTrain`
- `DlgEn_KeyTrainSetting`
- `DlgEn_WordTrainSetting`
- `DlgEn_ArticleTrainSetting`
- `DlgEn_KeyLesson`
- `DlgEn_WordLesson`
- `DlgEn_ArticleLesson`

### 中文拼音训练

- `frmChn_PhoneticTrain`
- `frmChn_PhraseTrain`
- `frmChn_ArticleTrain`
- `DlgChn_ArticleSetting`
- `DlgChn_PhoneticLesson`
- `DlgChn_PhraseLesson`
- `DlgChn_ArticleLesson`

### 五笔训练

- `frmWbRoot`
- `frmWbWord`
- `frmWbPhrase`
- `frmWbArticle`
- `DlgWbSelectLesson`
- `DlgWbSetting`

### 测试与自由输入

- `frmTest`
- `frmFreeType`
- `DlgTestSetting`
- `DlgTestSelect`
- `DlgTestResult`
- `DlgSelLsn`

## 主窗体

`Frm_Main` 包含 15 个控件：

```text
Form
lblInfo
Lab_User
Img_Sys_Menu
XBtn_Sys_Help
XBtn_Tuichudenglu
XBtn_Gerenjilu
XBtnJiaocheng
XBtnGame
XBtnTest
XBtnWubi
XBtnPinYin
XBtnEnglish
XBtn_Sys_Close
XBtn_Sys_Min
```

Web 映射：主窗体转为首页功能入口；个人记录和用户入口进入应用导航，不模拟桌面程序最小化、关闭按钮。

## 英文训练窗体

### 基础键位

`frmEn_KeyTrain_Basic` 包含：

```text
picActivateFinger
picProgress
Timer1
labLessonMsg
labPromptMsg
labTime
labSpeed
labVeracity
btnToNumpad
BtnReturn
BtnClose
btnMiniMize
BtnSelectLesson
CXKeyBoard1
BtnSetting
BtnHelp
```

其核心反馈链为：

```text
当前字符
→ 目标物理键
→ CXKeyBoard1 键帽高亮
→ picActivateFinger 手指提示
→ 时间 / 速度 / 正确率 / 进度
```

### 高级键位

相对基础键位增加 `PromptRTB` 和 `InputRTB`，保留 `CXKeyBoard1`，不再使用手指位图。

### 数字键盘

使用 `XNumBoard1` 和 `picActivateFinger`，并提供切换回标准键盘的按钮。

### 单词训练

使用 `PromptRTB`、`InputRTB`、`picExplanation` 和 `CXKeyBoard1`，说明单词释义是独立内容区域。

### 文章训练

使用单个 `RTB` 承载连续文章，保留课程选择、设置、帮助、统计和进度。

## 拼音与五笔窗体

拼音训练组合：

```text
PromptPhraseRTB
InputRTB
picPhonetic
CXKeyBoard1
```

五笔训练组合：

```text
rtfSubject
rtfInput
rtfCursor
lblCode
CWBBoard
picPrompt
```

五笔字根、单字、词组、文章窗体结构高度重复，应在 Web 版中共享同一工作区，仅替换课程内容和局部面板。

## 测试与自由打字

`frmTest` 和 `frmFreeType` 在通用训练结构之外增加：

```text
BtnPause
BtnStop
BtnSave
BtnScore
BtnOver
```

Web 版中练习和测试共享训练工作区，通过模式配置决定操作按钮和成绩规则。

## Web 版组件映射

```text
VB6 Form                    Vue

Frm_Main                 → HomePage
训练窗体                  → TrainingWorkspace
课程选择 Dialog           → LessonDrawer
设置 Dialog               → TrainingSettingsDialog
结果 Dialog               → SessionResultDialog
CXKeyBoard               → KeyboardGuide
XNumBoard                → NumpadGuide
CWBBoard                 → WubiGuide
picActivateFinger        → HandGuide
RichTextBox              → TypingText / InputMirror
Timer + Label            → TypingStats
picProgress              → LessonProgress
```

建议的统一结构：

```text
TrainingWorkspace
├─ TrainingTopBar
├─ TypingStats
├─ LessonProgress
├─ TrainingContent
├─ PromptBar
├─ GuidancePanel
│  ├─ KeyboardGuide
│  └─ HandGuide
└─ SessionActions
```

## 实施顺序

1. QWERTY 键位和手指映射
2. `KeyboardGuide`
3. `HandGuide`
4. `TrainingWorkspace`
5. `LessonDrawer`
6. `TrainingSettingsDialog`
7. `SessionResultDialog`
8. 扩展数字键盘、单词、文章、拼音和五笔模式

## 设计原则

- 保留原版“文字、键盘、手指、统计”反馈闭环，不复刻固定分辨率布局。
- 训练引擎、键位映射和视觉组件彼此解耦。
- 练习模式通过配置扩展，不为每一种模式复制完整页面。
- 桌面端展示完整键盘和手指提示；窄屏允许折叠指导区。
- 原版资源作为分析和本地原型参考，公开发布前需确认再分发权利。
