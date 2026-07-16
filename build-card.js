import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import { resolveCompleteWorkOutputPath } from './work-output.js';

/**
 * 读取文件内容
 */
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    console.error(`读取文件失败: ${filePath}`);
    throw error;
  }
}

/**
 * 规范化路径(自动处理Windows/Mac路径分隔符)
 */
function normalizePath(filePath) {
  return path.normalize(filePath);
}

/**
 * 解析字段值：优先按真实文件读取；否则按内联正文使用。
 * 注意：正文里常有 HTML 的 `/`（如 StatusPlaceHolderImpl/），不能仅凭斜杠当路径。
 */
function resolveFieldValue(value) {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  const text = String(value);
  const trimmed = text.trim();
  const normalized = normalizePath(trimmed);

  // 1) 磁盘上真有这个文件 → 读文件（最稳妥，恢复旧行为）
  try {
    if (fs.existsSync(normalized) && fs.statSync(normalized).isFile()) {
      return readFile(normalized);
    }
  } catch {
    // 继续下方判断
  }

  // 2) 明显是内联正文（多行 / HTML 标签 / 过长 / 中文标题符）→ 不当路径
  if (
    /[\n\r]/.test(text) ||
    /<[A-Za-z/!]/.test(text) ||
    /[【】]/.test(text) ||
    trimmed.length > 260
  ) {
    return text;
  }

  // 3) 像仓库内路径但文件不存在 → 报错，避免把路径字符串打进卡里
  const looksLikeRepoPath =
    /^(作品|封面图|基础模板|完整作品|MVU组件包)[\\/]/.test(trimmed) ||
    (/[\\/]/.test(trimmed) && /\.(md|txt|xyaml|yaml|yml|html|js|json)$/i.test(trimmed));

  if (looksLikeRepoPath) {
    return readFile(normalized);
  }

  // 4) 其余短文本当内联
  return text;
}

/**
 * 创建条目的固定结构
 */
function createEntryTemplate() {
  return {
    keys: [],
    secondary_keys: [],
    constant: true,
    selective: true,
    use_regex: true,
    extensions: {
      exclude_recursion: false,
      probability: 100,
      useProbability: true,
      selectiveLogic: 0,
      group: "",
      group_override: false,
      group_weight: 100,
      prevent_recursion: false,
      delay_until_recursion: false,
      scan_depth: null,
      match_whole_words: null,
      use_group_scoring: false,
      case_sensitive: null,
      automation_id: "",
      vectorized: false,
      sticky: 0,
      cooldown: 0,
      delay: 0,
      match_persona_description: false,
      match_character_description: false,
      match_character_personality: false,
      match_character_depth_prompt: false,
      match_scenario: false,
      match_creator_notes: false,
      triggers: [],
      ignore_budget: false
    }
  };
}

/**
 * 转换 position 字符串为数值
 */
function convertPosition(positionStr) {
  const positionMap = {
    'before_char': 0,
    'after_char': 1,
    'before_em': 5,
    'after_em': 6,
    'before_an': 2,
    'after_an': 3,
    'at_depth': 4
  };
  return positionMap[positionStr] ?? 0;
}

/**
 * 构建角色书条目
 */
function buildCharacterBookEntry(config, index) {
  const entry = createEntryTemplate();

  entry.id = index;
  entry.comment = config.comment;
  entry.content = config.content ? readFile(normalizePath(config.content)) : "";
  entry.enabled = config.enabled ?? true;
  entry.position = config.position ?? "after_char";
  entry.insertion_order = config.insertion_order ?? 100;

  // 设置扩展字段
  entry.extensions.position = convertPosition(entry.position);
  entry.extensions.display_index = index;
  entry.extensions.depth = config.depth ?? 4;
  entry.extensions.role = config.role ?? 0;

  // 允许 YAML 覆盖 keys / constant（dzmm 据教程不读常量条目时可用关键字条目）
  if (Array.isArray(config.keys)) {
    entry.keys = config.keys;
  }
  if (Array.isArray(config.secondary_keys)) {
    entry.secondary_keys = config.secondary_keys;
  }
  if (typeof config.constant === 'boolean') {
    entry.constant = config.constant;
  }

  // [initvar]初始化条目的特殊处理
  if (config.comment?.toLowerCase().includes('[initvar]')) {
    entry.constant = false;
  }

  return entry;
}

/**
 * SillyTavern 风格时间戳（对齐可导入的大唐风流卡）
 */
function formatTavernCreateDate(date = new Date()) {
  return (
    `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}` +
    ` @${date.getHours()}h ${date.getMinutes()}m ${date.getSeconds()}s ${date.getMilliseconds()}ms`
  );
}

/**
 * 创建固定的 regex_scripts
 */
function createRegexScripts(statusBarPath) {
  const scripts = [
    {
      id: "9698c545-91a1-42c1-a4d5-486057de5d7a",
      scriptName: "对AI隐藏状态栏",
      disabled: false,
      runOnEdit: true,
      findRegex: "<StatusPlaceHolderImpl/>",
      replaceString: "",
      trimStrings: [],
      placement: [2],
      substituteRegex: 0,
      minDepth: null,
      maxDepth: null,
      markdownOnly: false,
      promptOnly: true
    },
    {
      id: "fc3d2d10-c7bc-41b8-8eb5-6d36151134c2",
      scriptName: "去除更新变量",
      disabled: false,
      runOnEdit: true,
      findRegex: "/<(UpdateVariable|Analysis|JSONPatch)>[\\s\\S]*?</\\1>/gm",
      replaceString: "",
      trimStrings: [],
      placement: [2],
      substituteRegex: 0,
      minDepth: null,
      maxDepth: null,
      markdownOnly: true,
      promptOnly: true
    }
  ];

  // 状态栏脚本(如果提供了状态栏文件)
  if (statusBarPath) {
    const statusBarContent = readFile(normalizePath(statusBarPath));
    scripts.push({
      id: "0a826eea-6150-4ef8-b31b-0f10f6f12053",
      scriptName: "状态栏",
      findRegex: "<StatusPlaceHolderImpl/>",
      replaceString: "```\n" + statusBarContent + "\n```",
      trimStrings: [],
      placement: [2],
      disabled: false,
      markdownOnly: true,
      promptOnly: false,
      runOnEdit: true,
      substituteRegex: 0,
      minDepth: null,
      maxDepth: 2
    });
  }

  return scripts;
}

/**
 * 创建固定的 TavernHelper_scripts
 */
function createTavernHelperScripts(userScripts = []) {
  const scripts = [
    {
      type: "script",
      value: {
        id: "1f84fa2d-cd60-4015-be1b-cc801a8092be",
        name: "MVU Zod 脚本",
        content: "import 'https://testingcf.jsdelivr.net/gh/MagicalAstrogy/MagVarUpdate/artifact/bundle.js'",
        info: "",
        buttons: [
          {
            name: "重新处理变量",
            visible: false
          },
          {
            name: "重新读取初始变量",
            visible: false
          },
          {
            name: "清除旧楼层变量",
            visible: false
          }
        ],
        data: {
          "是否显示变量更新错误": "是",
          "构建信息": new Date().toISOString() + " (generated)"
        },
        enabled: true
      }
    }
  ];

  // 添加用户自定义脚本（如变量结构设计脚本）
  if (userScripts && userScripts.length > 0) {
    userScripts.forEach((scriptConfig, index) => {
      if (scriptConfig.content) {
        const scriptContent = readFile(normalizePath(scriptConfig.content));
        scripts.push({
          type: "script",
          value: {
            id: `user-script-${index}`,
            name: scriptConfig.name || `用户脚本 ${index + 1}`,
            content: scriptContent,
            info: "",
            buttons: [],
            data: {},
            enabled: scriptConfig.enabled ?? true
          }
        });
      }
    });
  }

  return scripts;
}

/**
 * 构建完整的角色卡
 */
function buildCharacterCard(configPath) {
  // 读取配置文件
  const configContent = readFile(configPath);
  const config = yaml.load(configContent);

  // 读取字段内容（支持文件路径或内联正文）
  const fields = {};
  for (const [key, value] of Object.entries(config.fields || {})) {
    fields[key] = resolveFieldValue(value);
  }

  // 构建角色书条目
  const entries = [];
  if (config.character_book?.entries) {
    config.character_book.entries.forEach((entryConfig, index) => {
      entries.push(buildCharacterBookEntry(entryConfig, index));
    });
  }

  // JSON 的 create_date 也用酒馆格式，与可导入的大唐风流一致
  const createDate = formatTavernCreateDate();

  // 构建完整的角色卡结构
  const card = {
    name: config.name,
    description: fields.description || "",
    personality: fields.personality || "",
    scenario: fields.scenario || "",
    first_mes: fields.first_mes || "",
    mes_example: fields.mes_example || "",
    creatorcomment: "",
    avatar: "none",
    talkativeness: config.extensions?.talkativeness || "0.5",
    fav: config.extensions?.fav || false,
    tags: [],
    spec: "chara_card_v3",
    spec_version: "3.0",
    data: {
      name: config.name,
      description: fields.description || "",
      personality: fields.personality || "",
      scenario: fields.scenario || "",
      first_mes: fields.first_mes || "",
      mes_example: fields.mes_example || "",
      creator_notes: fields.creator_notes || "",
      system_prompt: fields.system_prompt || "",
      post_history_instructions: fields.post_history_instructions || "",
      tags: [],
      creator: config.creator || "",
      character_version: config.character_version || "",
      alternate_greetings: [],
      extensions: {
        talkativeness: config.extensions?.talkativeness || "0.5",
        fav: config.extensions?.fav || false,
        world: config.extensions?.world || config.name,
        depth_prompt: {
          prompt: "",
          depth: 4,
          role: "system"
        },
        regex_scripts: createRegexScripts(config.extensions?.status_bar),
        TavernHelper_scripts: createTavernHelperScripts(config.scripts)
      },
      group_only_greetings: [],
      character_book: {
        entries: entries,
        name: config.character_book?.name || config.name
      }
    },
    create_date: createDate
  };

  return card;
}

/**
 * 主函数
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('用法: node build-card.js <配置文件路径>');
    console.error('示例: node build-card.js config.yaml');
    process.exit(1);
  }

  const configPath = args[0];

  try {
    console.log(`正在读取配置文件: ${configPath}`);
    const card = buildCharacterCard(configPath);

    const outputPath = resolveCompleteWorkOutputPath(card.name, '.json');
    fs.writeFileSync(outputPath, JSON.stringify(card, null, 4), 'utf-8');

    console.log(`✓ 角色卡已成功生成: ${outputPath}`);
  } catch (error) {
    console.error('构建失败:', error.message);
    process.exit(1);
  }
}

export { buildCharacterCard, buildCharacterBookEntry, readFile, normalizePath, resolveFieldValue };

const __filename = fileURLToPath(import.meta.url);

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main();
}
