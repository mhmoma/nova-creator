/**
 * 本地校验角色卡 PNG 是否含有效 chara/ccv3 元数据
 * 用法: node verify-card-png.js <文件.png> [更多.png...]
 */
import fs from 'fs';
import path from 'path';
import extract from 'png-chunks-extract';
import PNGtext from 'png-chunk-text';

function verify(filePath) {
  const abs = path.resolve(filePath);
  const result = { file: abs, ok: false, errors: [], info: {} };

  if (!fs.existsSync(abs)) {
    result.errors.push('文件不存在');
    return result;
  }

  const buf = fs.readFileSync(abs);
  result.info.size = buf.length;

  if (buf.length < 8 || buf[0] !== 0x89 || buf[1] !== 0x50) {
    result.errors.push('不是合法 PNG（文件头错误）。可能被微信/QQ 转成了普通图或 webp。');
    return result;
  }

  let chunks;
  try {
    chunks = extract(new Uint8Array(buf));
  } catch (e) {
    result.errors.push('PNG 解析失败: ' + e.message);
    return result;
  }

  const texts = chunks
    .filter((c) => c.name === 'tEXt')
    .map((c) => PNGtext.decode(c.data));

  const chara = texts.find((t) => t.keyword.toLowerCase() === 'chara');
  const ccv3 = texts.find((t) => t.keyword.toLowerCase() === 'ccv3');

  if (!chara && !ccv3) {
    result.errors.push('没有 chara/ccv3 文本块 —— 这是一张普通图片，角色数据已丢失。');
    result.errors.push('常见原因：用微信/QQ/浏览器压缩图发送；用画图软件另存；上传到会剥元数据的图床。');
    return result;
  }

  for (const [name, chunk] of [
    ['chara', chara],
    ['ccv3', ccv3],
  ]) {
    if (!chunk) continue;
    try {
      const json = Buffer.from(chunk.text, 'base64').toString('utf8');
      const card = JSON.parse(json);
      result.info[name] = {
        spec: card.spec,
        name: card.data?.name || card.name,
        descLen: (card.data?.description || card.description || '').length,
        firstMesLen: (card.data?.first_mes || card.first_mes || '').length,
        bookEntries: card.data?.character_book?.entries?.length ?? 0,
      };
    } catch (e) {
      result.errors.push(`${name} 块无法解码: ${e.message}`);
    }
  }

  if (result.errors.length === 0) {
    result.ok = true;
  }
  return result;
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('用法: node verify-card-png.js <角色卡.png> [更多.png...]');
  process.exit(1);
}

let allOk = true;
for (const f of files) {
  const r = verify(f);
  console.log('\n====', path.basename(r.file), '====');
  console.log(r.ok ? '✓ 本地校验通过（文件本身是有效角色卡）' : '✗ 本地校验失败');
  console.log(JSON.stringify(r.info, null, 2));
  if (r.errors.length) {
    allOk = false;
    r.errors.forEach((e) => console.log(' -', e));
  }
}

if (allOk) {
  console.log('\n结论: 文件在磁盘上是完好的。若平台仍提示导入无效，问题在「上传途径」或「平台本身」，不是打包脚本。');
  console.log('请尝试: 1) 直接本机选文件上传，勿经微信/QQ 2) 改导同目录 .json 3) 告知平台名称与完整报错原文');
}

process.exit(allOk ? 0 : 1);
