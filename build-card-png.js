import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import sharp from 'sharp';
import extract from 'png-chunks-extract';
import encode from 'png-chunks-encode';
import PNGtext from 'png-chunk-text';
import { buildCharacterCard } from './build-card.js';
import { resolveCompleteWorkOutputPath } from './work-output.js';

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp'];
const CARD_TEXT_KEYWORDS = new Set(['chara', 'ccv3']);

/**
 * 用 sharp 重编码图像，清除 EXIF / ICC / 原始 PNG 文本块等元数据
 */
async function loadCleanImageBuffer(imagePath) {
  return sharp(imagePath, { failOn: 'none' })
    .rotate()
    .png({ force: true, compressionLevel: 9 })
    .toBuffer();
}

/**
 * 规范化为 SillyTavern 可识别的 V3 角色卡结构
 */
function normalizeCardForPng(card) {
  const normalized = structuredClone(card);

  normalized.spec = 'chara_card_v3';
  normalized.spec_version = '3.0';

  if (normalized.data?.extensions?.world != null) {
    normalized.data.extensions.world = String(normalized.data.extensions.world);
  }

  if (normalized.extensions?.world != null) {
    normalized.extensions.world = String(normalized.extensions.world);
  }

  const worldName = normalized.data?.character_book?.name || normalized.name;
  if (normalized.data?.extensions && (!normalized.data.extensions.world || normalized.data.extensions.world === '1')) {
    normalized.data.extensions.world = worldName;
  }

  return normalized;
}

/**
 * 按 SillyTavern character-card-parser.write 的方式嵌入元数据：
 * - chara 与 ccv3 写入相同内容（均为 V3 JSON 的 base64）
 * - chara 在前，ccv3 在后
 * - 先移除已有的 chara / ccv3 块
 */
function embedCardIntoPng(pngBuffer, card) {
  const normalized = normalizeCardForPng(card);
  const cardJson = JSON.stringify(normalized);
  const base64Payload = Buffer.from(cardJson, 'utf-8').toString('base64');

  const chunks = extract(new Uint8Array(pngBuffer));

  for (let i = chunks.length - 1; i >= 0; i--) {
    if (chunks[i].name !== 'tEXt') continue;
    const decoded = PNGtext.decode(chunks[i].data);
    if (CARD_TEXT_KEYWORDS.has(decoded.keyword.toLowerCase())) {
      chunks.splice(i, 1);
    }
  }

  chunks.splice(-1, 0, PNGtext.encode('chara', base64Payload));
  chunks.splice(-1, 0, PNGtext.encode('ccv3', base64Payload));

  return Buffer.from(encode(chunks));
}

function readCardFromPath(inputPath) {
  const ext = path.extname(inputPath).toLowerCase();

  if (ext === '.json') {
    return JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
  }

  if (ext === '.yaml' || ext === '.yml') {
    return buildCharacterCard(inputPath);
  }

  throw new Error(`不支持的输入格式: ${ext}，请使用 .json 或 .yaml`);
}

function readCoverFromConfig(inputPath) {
  const ext = path.extname(inputPath).toLowerCase();
  if (ext !== '.yaml' && ext !== '.yml') {
    return null;
  }

  const config = yaml.load(fs.readFileSync(inputPath, 'utf-8'));
  const cover = config?.cover;
  if (!cover || typeof cover !== 'string') {
    return null;
  }

  return path.resolve(cover.trim());
}

function listCoverImages(coverDir) {
  if (!fs.existsSync(coverDir)) {
    return [];
  }

  return fs.readdirSync(coverDir)
    .filter((file) => IMAGE_EXTENSIONS.includes(path.extname(file).toLowerCase()))
    .map((file) => path.join(coverDir, file));
}

function findCoverImage(cardName, coverDir, explicitCover) {
  if (explicitCover) {
    if (!fs.existsSync(explicitCover)) {
      throw new Error(`封面图不存在: ${explicitCover}`);
    }
    return explicitCover;
  }

  const covers = listCoverImages(coverDir);
  if (covers.length === 0) {
    throw new Error(`封面图目录为空: ${coverDir}`);
  }

  const exact = covers.find((coverPath) => {
    const base = path.basename(coverPath, path.extname(coverPath));
    return base === cardName;
  });
  if (exact) return exact;

  const insensitive = covers.find((coverPath) => {
    const base = path.basename(coverPath, path.extname(coverPath));
    return base.toLowerCase() === cardName.toLowerCase();
  });
  if (insensitive) return insensitive;

  const available = covers.map((coverPath) => path.basename(coverPath)).join(', ');
  throw new Error(
    `未在 ${coverDir} 找到与角色卡同名的封面图。\n` +
    `请放置 ${cardName}.png（或 .jpg/.webp 等），或使用 --cover 指定。\n` +
    `当前可用封面: ${available}`
  );
}

function parseArgs(argv) {
  const options = {
    inputPath: null,
    cover: null,
    coverDir: path.resolve('封面图'),
    outputPath: null,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--cover') {
      options.cover = path.resolve(argv[++i]);
      continue;
    }

    if (arg === '--cover-dir') {
      options.coverDir = path.resolve(argv[++i]);
      continue;
    }

    if (arg === '--output' || arg === '-o') {
      options.outputPath = path.resolve(argv[++i]);
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }

    if (!arg.startsWith('-') && !options.inputPath) {
      options.inputPath = path.resolve(arg);
    }
  }

  return options;
}

function printHelp() {
  console.log(`用法: node build-card-png.js <角色卡.json|.yaml> [选项]

将角色卡嵌入 PNG 封面图，生成可直接导入 SillyTavern 的角色卡图片。

选项:
  --cover <路径>       指定封面图（优先于 YAML 配置中的 cover 字段）
  --cover-dir <目录>   封面图目录（默认: ./封面图；无 cover 时按角色名匹配）
  -o, --output <路径>  输出 PNG 路径（默认：完整作品/<角色名>/<角色名>.png）
  -h, --help           显示帮助

说明:
  - 封面图会先经 sharp 重编码，抹除 EXIF、ICC、原 PNG 文本块等元数据
  - chara 与 ccv3 写入相同的 V3 角色卡 JSON（SillyTavern 兼容格式）
  - 封面图命名建议与角色卡名称一致，例如 封面图/红尘卷书.png

示例:
  node build-card-png.js 红尘卷书.json
  node build-card-png.js config.yaml --cover 封面图/自定义.png
  node build-card-png.js 示例卡片.json -o output/示例卡片.png`);
}

async function buildCardPng(inputPath, options = {}) {
  const card = readCardFromPath(inputPath);
  const cardName = card.name || path.basename(inputPath, path.extname(inputPath));
  const coverFromConfig = readCoverFromConfig(inputPath);
  const coverPath = findCoverImage(cardName, options.coverDir, options.cover || coverFromConfig);
  const outputPath = options.outputPath || resolveCompleteWorkOutputPath(cardName, '.png');

  console.log(`角色卡: ${cardName}`);
  console.log(`封面图: ${coverPath}`);
  console.log('正在清除原图元数据...');

  const cleanImage = await loadCleanImageBuffer(coverPath);
  const pngWithCard = embedCardIntoPng(cleanImage, card);

  fs.writeFileSync(outputPath, pngWithCard);

  const textChunks = extract(new Uint8Array(pngWithCard))
    .filter((chunk) => chunk.name === 'tEXt')
    .map((chunk) => PNGtext.decode(chunk.data).keyword);

  console.log(`✓ 角色卡 PNG 已生成: ${outputPath}`);
  console.log(`  嵌入元数据块: ${textChunks.join(', ')}`);

  return outputPath;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help || !options.inputPath) {
    printHelp();
    process.exit(options.help ? 0 : 1);
  }

  try {
    await buildCardPng(options.inputPath, options);
  } catch (error) {
    console.error('打包失败:', error.message);
    process.exit(1);
  }
}

export { buildCardPng, embedCardIntoPng, findCoverImage, loadCleanImageBuffer, normalizeCardForPng };

const __filename = fileURLToPath(import.meta.url);

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main();
}
