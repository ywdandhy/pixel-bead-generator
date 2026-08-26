// 下载 curatedCharacters.ts 里所有 imageUrl 到 public/curated/,并把 URL 改成本地路径
// 用法: node scripts/download-curated.mjs
// 已下载的文件会跳过(支持断点续跑)

import fs from 'fs/promises';
import path from 'path';

const SOURCE_FILE = 'src/data/curatedCharacters.ts';
const OUTPUT_DIR = 'public/curated';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function main() {
  const content = await fs.readFile(SOURCE_FILE, 'utf-8');
  // 匹配 { name: '...', category: '...', imageUrl: '...', tags: [...] }
  const entryRegex = /\{\s*name:\s*'([^']+)',\s*category:\s*'([^']+)',\s*imageUrl:\s*'([^']+)',\s*tags:\s*\[([^\]]*)\]\s*\}/g;
  const entries = [];
  let match;
  while ((match = entryRegex.exec(content)) !== null) {
    entries.push({ name: match[1], category: match[2], imageUrl: match[3], tagsRaw: match[4] });
  }
  console.log(`Found ${entries.length} entries`);

  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  let updatedContent = content;
  let ok = 0, fail = 0, skip = 0;
  const failures = [];

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    // 只处理 http(s) 开头的 URL(已经是本地路径的跳过)
    if (!/^https?:\/\//.test(e.imageUrl)) {
      skip++;
      continue;
    }
    const slug = String(i + 1).padStart(4, '0');
    const ext = (e.imageUrl.match(/f=(JPEG|PNG|GIF|WEBP)/i)?.[1] || 'jpg').toLowerCase();
    const filename = `${slug}.${ext}`;
    const filepath = path.join(OUTPUT_DIR, filename);
    const localPath = `/curated/${filename}`;

    try {
      // 已存在则跳过下载
      try {
        await fs.access(filepath);
        ok++;
        if ((i + 1) % 50 === 0) console.log(`[${i + 1}/${entries.length}] ${e.name} (cached)`);
      } catch {
        const res = await fetch(e.imageUrl, { headers: { 'User-Agent': UA, 'Referer': 'https://image.baidu.com/' } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        await fs.writeFile(filepath, buf);
        ok++;
        if ((i + 1) % 50 === 0) console.log(`[${i + 1}/${entries.length}] ${e.name} → ${filename} (${buf.length} bytes)`);
      }
      updatedContent = updatedContent.replace(`'${e.imageUrl}'`, `'${localPath}'`);
    } catch (err) {
      fail++;
      failures.push(`${e.name} (${e.category}): ${err.message}`);
      console.error(`[${i + 1}/${entries.length}] ${e.name} FAILED: ${err.message}`);
    }
    await new Promise(r => setTimeout(r, 150));
  }

  await fs.writeFile(SOURCE_FILE, updatedContent);
  console.log(`\nDone: ${ok} ok, ${fail} failed, ${skip} skipped`);
  if (failures.length) {
    console.log('Failures:');
    failures.forEach(f => console.log(`  - ${f}`));
  }
  console.log(`Updated ${SOURCE_FILE} with local paths`);
}

main().catch(err => { console.error(err); process.exit(1); });
