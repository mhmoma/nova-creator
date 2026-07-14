import fs from 'fs';
import path from 'path';

const COMPLETE_WORKS_DIR = path.resolve('完整作品');

/**
 * 根据角色名解析完整作品输出路径：完整作品/<角色名>/<角色名>.<扩展名>
 */
export function resolveCompleteWorkOutputPath(cardName, extension) {
  const workDir = path.join(COMPLETE_WORKS_DIR, cardName);
  fs.mkdirSync(workDir, { recursive: true });
  return path.join(workDir, `${cardName}${extension}`);
}
