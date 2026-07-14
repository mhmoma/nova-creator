# NOVA Creator

SillyTavern 角色卡自动化创作工具链：从需求表单到 JSON / PNG 成品，一套流程跑通。

## 核心特性

- **任务清单生成器**：在浏览器中填写作品信息，一键导出结构化 `to-do.md`
- **封面图路径配置**：清单界面可上传封面并写入 YAML 的 `cover` 字段，PNG 打包时直接读取
- **JSON 打包**：将分散的设定文件整合为 SillyTavern V3 角色卡 JSON
- **PNG 打包**：将角色卡数据嵌入封面图，生成可直接导入的图片角色卡
- **角色卡解包**：将现有 JSON 角色卡还原为可编辑的源文件
- **MVU 支持**：内置 MVU Zod 变量系统、分阶段人设、状态栏等高级能力

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 生成创作清单

在浏览器中打开 `to-do-generator.html`，填写作品信息后点击「生成 Markdown」。

生成内容包含：

- 创作任务清单
- YAML 打包配置模板（含 `cover` 封面路径）
- JSON / PNG 打包说明

若上传了封面图，会同时下载图片文件，保存到配置中的路径即可（如 `封面图/作品名.png`）。

### 3. AI 辅助创作

将 `to-do.md` 交给 AI（Cursor / Claude / Gemini 等），按清单完成：

- `作品/<作品名>/` 下的设定文件
- 根目录的 `<作品名>.yaml` 配置文件

### 4. 打包角色卡

**生成 JSON：**

```bash
node build-card.js <作品名>.yaml
# 或
npm run build -- <作品名>.yaml
```

输出：`完整作品/<作品名>/<作品名>.json`

**生成 PNG：**

```bash
node build-card-png.js <作品名>.yaml
# 或
npm run build:png -- <作品名>.yaml
```

PNG 打包会读取 YAML 中的 `cover` 字段作为封面图路径；也可用 `--cover` 手动指定：

```bash
node build-card-png.js <作品名>.yaml --cover 封面图/自定义.png
```

输出：`完整作品/<作品名>/<作品名>.png`

## 配置文件

配置文件使用 YAML 格式，示例见 `config.example.yaml`：

```yaml
name: 示例卡片
creator: ""
character_version: ""

# PNG 打包时使用的封面图（项目内相对路径）
cover: 封面图/示例卡片.png

fields:
  description: 作品/示例作品/角色设定.xyaml
  first_mes: 作品/示例作品/开场白.md
  personality: ""
  scenario: ""
  mes_example: ""
  creator_notes: ""
  system_prompt: ""
  post_history_instructions: ""

extensions:
  talkativeness: "0.5"
  fav: false
  world: 示例卡片
  status_bar: 作品/示例作品/状态栏.html  # 可选

character_book:
  name: 示例卡片
  entries:
    - comment: "背景设定"
      content: 作品/示例作品/背景设定.xyaml
      enabled: true
      position: before_char
      insertion_order: 1
      depth: 4
      role: 0
```

## 角色卡解包

将现有 JSON 或 PNG 角色卡还原为可编辑源文件，并自动生成 YAML 配置。

```bash
node unpack-card.js <角色卡.json|.png> [输出目录]
# 或
npm run unpack -- <角色卡.json|.png> [输出目录]
```

**示例：**

```bash
# 解包 JSON 角色卡
node unpack-card.js 完整作品/示例卡片/示例卡片.json

# 解包 PNG 角色卡（自动提取嵌入的角色卡数据）
node unpack-card.js 完整作品/示例卡片/示例卡片.png
```

**解包输出：**

```
作品/<角色名>/
├── 简介.txt
├── 开场白.md
├── 状态栏.html          # 如有
├── 背景设定.xyaml       # 世界书条目
├── ...
└── <角色名>.yaml        # 可直接用于 build-card.js / build-card-png.js
```

- 从 **PNG** 解包时，YAML 中的 `cover` 会自动指向该 PNG 路径
- 从 **JSON** 解包时，`cover` 默认写入 `封面图/<角色名>.png`

修改源文件后，可用生成的 YAML 重新打包：

```bash
node build-card.js 作品/<角色名>/<角色名>.yaml
node build-card-png.js 作品/<角色名>/<角色名>.yaml
```

## 项目结构

```
NOVA-CREATOR/
├── to-do-generator.html    # 任务清单生成器（浏览器打开）
├── to-do-generator.js
├── to-do-generator.css
├── build-card.js           # JSON 打包
├── build-card-png.js       # PNG 打包
├── unpack-card.js          # 解包
├── work-output.js          # 输出路径工具
├── config.example.yaml     # 配置示例
├── 示例卡片.json           # 角色卡结构参考
├── 基础模板/               # 创作模板
├── MVU组件包/              # MVU 系统文档
├── 额外补充包/             # 可选补充模板
├── 作品/                   # 创作源文件（本地，不入库）
├── 封面图/                 # 封面图（本地，不入库）
└── 完整作品/               # 打包输出（本地，不入库）
```

## 命令一览

| 命令 | 说明 |
|------|------|
| `npm run build -- <config.yaml>` | 生成 JSON 角色卡 |
| `npm run build:png -- <config.yaml>` | 生成 PNG 角色卡 |
| `npm run unpack -- <card.json\|.png> [输出目录]` | 解包角色卡 |
| `node build-card-png.js <config.yaml> --cover <路径>` | 指定封面图打包 |

## 前置要求

- Node.js 18+
- 现代浏览器（用于任务清单生成器）
- 推荐编辑器：VS Code / Cursor
- 推荐扩展：XYAML Support（`.xyaml` 语法高亮）

## 工作流程示意

```
填写 to-do-generator.html
        ↓
  下载 to-do.md + 封面图
        ↓
   AI 按清单创作源文件
        ↓
  编写 <作品名>.yaml（含 cover）
        ↓
  build-card.js  →  完整作品/xxx/xxx.json
  build-card-png.js  →  完整作品/xxx/xxx.png
        ↓
     导入 SillyTavern

修改已有角色卡：
  unpack-card.js  →  作品/xxx/（源文件 + xxx.yaml）
        ↓
  修改源文件  →  build-card.js / build-card-png.js
```

## 许可证

[Apache-2.0](LICENSE)
