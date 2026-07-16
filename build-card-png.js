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
 * 加载封面：PNG 尽量保留原文件块结构（多 IDAT / pHYs），
 * 与可导入的《大唐风流》打包方式一致；非 PNG 再经 sharp 转码。
 */
async function loadCleanImageBuffer(imagePath) {
  const ext = path.extname(imagePath).toLowerCase();
  if (ext === '.png') {
    return fs.readFileSync(imagePath);
  }

  return sharp(imagePath, { failOn: 'none' })
    .rotate()
    .png({ force: true, compressionLevel: 9 })
    .toBuffer();
}

/**
 * SillyTavern 风格时间戳（对齐可导入的大唐风流卡）
 * 例：2026-7-15 @22h 38m 10s 752ms
 */
function formatTavernCreateDate(date = new Date()) {
  return (
    `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}` +
    ` @${date.getHours()}h ${date.getMinutes()}m ${date.getSeconds()}s ${date.getMilliseconds()}ms`
  );
}

/**
 * 规范化为 V3；create_date 用酒馆格式，不用 ISO。
 */
function normalizeCardForPng(card) {
  const normalized = structuredClone(card);

  normalized.spec = 'chara_card_v3';
  normalized.spec_version = '3.0';

  if (!normalized.data) normalized.data = {};

  if (normalized.data.extensions?.world != null) {
    normalized.data.extensions.world = String(normalized.data.extensions.world);
  }

  if (normalized.extensions?.world != null) {
    normalized.extensions.world = String(normalized.extensions.world);
  }

  const worldName = normalized.data?.character_book?.name || normalized.name;
  if (normalized.data?.extensions && (!normalized.data.extensions.world || normalized.data.extensions.world === '1')) {
    normalized.data.extensions.world = worldName;
  }

  normalized.create_date = formatTavernCreateDate();

  return normalized;
}

/**
 * 嵌入元数据（对齐大唐风流可导入包）：
 * - chara / ccv3 同写 V3
 * - 不合并 IDAT、不删 pHYs
 * - 只移除旧 chara/ccv3，再把新 tEXt 插到 IEND 前
 */
function embedCardIntoPng(pngBuffer, card) {
  const normalized = normalizeCardForPng(card);
  const base64Payload = Buffer.from(JSON.stringify(normalized), 'utf-8').toString('base64');

  const chunks = extract(new Uint8Array(pngBuffer));

  for (let i = chunks.length - 1; i >= 0; i--) {
    if (chunks[i].name !== 'tEXt') continue;
    try {
      const decoded = PNGtext.decode(chunks[i].data);
      if (CARD_TEXT_KEYWORDS.has(decoded.keyword.toLowerCase())) {
        chunks.splice(i, 1);
      }
    } catch {
      // keep
    }
  }

  const textChunks = [
    PNGtext.encode('chara', base64Payload),
    PNGtext.encode('ccv3', base64Payload),
  ];

  chunks.splice(-1, 0, ...textChunks);

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

    if (!options.inputPath) {
      options.inputPath = path.resolve(arg);
    }
  }

  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (!options.inputPath) {
    console.error('用法: node build-card-png.js <config.yaml|card.json> [--cover 封面图] [--output 输出.png]');
    process.exit(1);
  }

  const card = readCardFromPath(options.inputPath);
  const cardName = card.data?.name || card.name;
  if (!cardName) {
    throw new Error('角色卡缺少 name');
  }

  const explicitCover = options.cover || readCoverFromConfig(options.inputPath);
  const coverPath = findCoverImage(cardName, options.coverDir, explicitCover);
  const imageBuffer = await loadCleanImageBuffer(coverPath);
  const pngBuffer = embedCardIntoPng(imageBuffer, card);

  const outputPath =
    options.outputPath ||
    resolveCompleteWorkOutputPath(cardName, '.png');

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, pngBuffer);

  console.log(`角色卡: ${cardName}`);
  console.log(`封面图: ${coverPath}`);
  console.log(`✓ 角色卡 PNG 已生成: ${outputPath}`);
  console.log('  嵌入元数据块: chara, ccv3');
}

const currentFile = path.resolve(fileURLToPath(import.meta.url));
const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedFile && currentFile === invokedFile) {
  main().catch((err) => {
    console.error('构建失败:', err.message || err);
    process.exit(1);
  });
}
