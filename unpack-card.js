import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import extract from 'png-chunks-extract';
import PNGtext from 'png-chunk-text';

const CARD_TEXT_KEYWORDS = ['ccv3', 'chara'];

/**
 * 读取 JSON 文件
 */
function readJsonFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`读取 JSON 文件失败: ${filePath}`);
    throw error;
  }
}

/**
 * 从 PNG 角色卡中提取 JSON 数据
 */
function readCardFromPng(pngPath) {
  const pngBuffer = fs.readFileSync(pngPath);
  const chunks = extract(new Uint8Array(pngBuffer));

  for (const keyword of CARD_TEXT_KEYWORDS) {
    const chunk = chunks.find((item) => {
      if (item.name !== 'tEXt') return false;
      const decoded = PNGtext.decode(item.data);
      return decoded.keyword.toLowerCase() === keyword;
    });

    if (!chunk) continue;

    const decoded = PNGtext.decode(chunk.data);
    const jsonText = Buffer.from(decoded.text, 'base64').toString('utf-8');
    return JSON.parse(jsonText);
  }

  throw new Error('PNG 中未找到 chara / ccv3 角色卡数据');
}

/**
 * 读取角色卡（支持 JSON / PNG）
 */
function readCharacterCard(inputPath) {
  const ext = path.extname(inputPath).toLowerCase();

  if (ext === '.json') {
    return readJsonFile(inputPath);
  }

  if (ext === '.png') {
    return readCardFromPng(inputPath);
  }

  throw new Error(`不支持的输入格式: ${ext}，请使用 .json 或 .png`);
}

/**
 * 写入文件
 */
function writeFile(filePath, content) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content, 'utf-8');
  } catch (error) {
    console.error(`写入文件失败: ${filePath}`);
    throw error;
  }
}

/**
 * 转换 position 数值为字符串
 */
function convertPositionToString(positionNum) {
  const positionMap = {
    0: 'before_char',
    1: 'after_char',
    5: 'before_em',
    6: 'after_em',
    2: 'before_an',
    3: 'after_an',
    4: 'at_depth'
  };
  return positionMap[positionNum] || 'after_char';
}

/**
 * 安全化文件名（移除不合法字符）
 */
function sanitizeFileName(name) {
  return name.replace(/[<>:"/\\|?*]/g, '_').trim();
}

/**
 * 解包世界书条目
 */
function unpackCharacterBookEntries(entries, outputDir) {
  const entriesConfig = [];

  entries.forEach((entry, index) => {
    const comment = entry.comment || `条目${index}`;
    const fileName = sanitizeFileName(comment);

    let fileExt = '.xyaml';
    if (fileName.includes('变量初始化') || fileName.includes('变量更新规则') || fileName.includes('变量处理指令集')) {
      fileExt = '.yaml';
    }

    const fullFileName = `${fileName}${fileExt}`;
    const entryPath = path.join(outputDir, fullFileName);

    if (entry.content) {
      writeFile(entryPath, entry.content);
    }

    entriesConfig.push({
      comment: entry.comment,
      content: fullFileName,
      enabled: entry.enabled ?? true,
      position: entry.position || convertPositionToString(entry.extensions?.position),
      insertion_order: entry.insertion_order ?? 100,
      depth: entry.extensions?.depth ?? 4,
      role: entry.extensions?.role ?? 0
    });
  });

  return entriesConfig;
}

/**
 * 提取状态栏脚本
 */
function extractStatusBar(regexScripts) {
  if (!regexScripts) return null;

  const statusBarScript = regexScripts.find(script =>
    script.scriptName === '状态栏' && script.findRegex === '<StatusPlaceHolderImpl/>'
  );

  if (statusBarScript?.replaceString) {
    return statusBarScript.replaceString.replace(/^```\n/, '').replace(/\n```$/, '');
  }

  return null;
}

/**
 * 提取用户脚本
 */
function extractUserScripts(tavernHelperScripts) {
  if (!tavernHelperScripts) return [];

  const userScripts = [];

  tavernHelperScripts.forEach((scriptWrapper) => {
    if (scriptWrapper.type !== 'script' || !scriptWrapper.value) return;

    const script = scriptWrapper.value;
    if (script.name === 'MVU Zod 脚本' || script.id === '1f84fa2d-cd60-4015-be1b-cc801a8092be') {
      return;
    }

    userScripts.push({
      name: script.name,
      content: script.content,
      enabled: script.enabled ?? true
    });
  });

  return userScripts;
}

/**
 * 解包角色卡
 */
function unpackCharacterCard(inputPath, outputDir) {
  const resolvedInputPath = path.resolve(inputPath);
  console.log(`正在读取角色卡: ${resolvedInputPath}`);
  const card = readCharacterCard(resolvedInputPath);

  const cardName = card.name || 'character';
  const workDir = path.join(outputDir, cardName);

  console.log(`解包到目录: ${workDir}`);

  if (!fs.existsSync(workDir)) {
    fs.mkdirSync(workDir, { recursive: true });
  }

  const data = card.data || card;
  const inputExt = path.extname(resolvedInputPath).toLowerCase();
  const relativeInputPath = path.relative(process.cwd(), resolvedInputPath).replace(/\\/g, '/');

  if (data.description) {
    writeFile(path.join(workDir, '简介.txt'), data.description);
  }

  if (data.first_mes) {
    writeFile(path.join(workDir, '开场白.md'), data.first_mes);
  }

  let entriesConfig = [];
  if (data.character_book?.entries?.length) {
    console.log(`解包 ${data.character_book.entries.length} 个世界书条目...`);
    entriesConfig = unpackCharacterBookEntries(data.character_book.entries, workDir);
  }

  let statusBarPath = null;
  if (data.extensions?.regex_scripts) {
    const statusBarContent = extractStatusBar(data.extensions.regex_scripts);
    if (statusBarContent) {
      const statusBarFile = '状态栏.html';
      writeFile(path.join(workDir, statusBarFile), statusBarContent);
      statusBarPath = statusBarFile;
      console.log('✓ 提取状态栏');
    }
  }

  const scriptsConfig = [];
  if (data.extensions?.TavernHelper_scripts) {
    const userScripts = extractUserScripts(data.extensions.TavernHelper_scripts);
    userScripts.forEach((script) => {
      const scriptFileName = `${sanitizeFileName(script.name)}.js`;
      writeFile(path.join(workDir, scriptFileName), script.content);
      scriptsConfig.push({
        name: script.name,
        content: scriptFileName,
        enabled: script.enabled
      });
      console.log(`✓ 提取脚本: ${script.name}`);
    });
  }

  const relativeWorkDir = path.relative(process.cwd(), workDir).replace(/\\/g, '/');

  const config = {
    name: cardName,
    creator: data.creator || '',
    character_version: data.character_version || '',
    fields: {
      description: data.description ? `${relativeWorkDir}/简介.txt` : '',
      personality: '',
      scenario: '',
      first_mes: data.first_mes ? `${relativeWorkDir}/开场白.md` : '',
      mes_example: '',
      creator_notes: data.creator_notes || '',
      system_prompt: data.system_prompt || '',
      post_history_instructions: data.post_history_instructions || ''
    },
    extensions: {
      talkativeness: data.extensions?.talkativeness || '0.5',
      fav: data.extensions?.fav || false,
      world: data.extensions?.world || cardName,
      status_bar: statusBarPath ? `${relativeWorkDir}/${statusBarPath}` : undefined
    },
    character_book: {
      name: data.character_book?.name || cardName,
      entries: entriesConfig.map(entry => ({
        ...entry,
        content: `${relativeWorkDir}/${entry.content}`
      }))
    }
  };

  if (inputExt === '.png') {
    config.cover = relativeInputPath;
    console.log(`✓ 已写入封面路径: ${relativeInputPath}`);
  } else {
    config.cover = `封面图/${cardName}.png`;
  }

  if (scriptsConfig.length > 0) {
    config.scripts = scriptsConfig.map(script => ({
      ...script,
      content: `${relativeWorkDir}/${script.content}`
    }));
  }

  if (!config.extensions.status_bar) {
    delete config.extensions.status_bar;
  }

  const configPath = path.join(workDir, `${cardName}.yaml`);
  writeFile(configPath, yaml.dump(config, { lineWidth: -1, noRefs: true }));

  console.log(`✓ 配置文件已生成: ${configPath}`);
  console.log('✓ 解包完成!');

  return workDir;
}

function printHelp() {
  console.log(`用法: node unpack-card.js <角色卡.json|.png> [输出目录]

将 SillyTavern 角色卡解包为可编辑源文件，并生成可用于重新打包的 YAML 配置。

参数:
  <角色卡路径>   支持 .json 或 .png
  [输出目录]     默认: ./作品

示例:
  node unpack-card.js 完整作品/示例/示例.json
  node unpack-card.js 完整作品/示例/示例.png ./作品
  npm run unpack -- 完整作品/示例/示例.json`);
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    printHelp();
    process.exit(args.length === 0 ? 1 : 0);
  }

  const inputPath = args[0];
  const outputDir = args[1] || './作品';

  try {
    unpackCharacterCard(inputPath, outputDir);
  } catch (error) {
    console.error('解包失败:', error.message);
    process.exit(1);
  }
}

export { unpackCharacterCard, readCharacterCard, readCardFromPng };

const __filename = fileURLToPath(import.meta.url);

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main();
}
