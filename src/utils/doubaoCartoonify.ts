// 豆包 Seedream 4.0 图生图 API（动漫风格转换）
// 文档：https://www.volcengine.com/docs/679/1397048
// 前端直调（API 允许 localhost CORS）。API Key 在 .env.local 的 VITE_ARK_API_KEY。
// ⚠️ Key 会进前端 bundle，仅适合本地工具；公开部署需加后端代理。

const ARK_ENDPOINT = 'https://ark.cn-beijing.volces.com/api/v3/images/generations';
const MODEL = 'doubao-seedream-4-0-250828';

// 拼豆友好的抽象动漫风格提示词：Q 版 + 低饱和 + 平涂 + 粗线条，主色调 3-4 种便于映射到 MARD 调色板
const PROMPT = '给我做一张抽象动漫图 面部特征做抽象简化处理——大眼睛、小鼻子、小嘴巴，脸型圆润柔和 保留原始人物的发型、发色、眼镜（如有）、服装风格，确保可辨认 身体比例采用Q版风格（约2-3头身），四肢圆润短小 色彩：克制、低饱和度——使用柔和淡彩，避免过于鲜艳或荧光色；整体主色调不超过3-4种 采用干净的平涂上色+柔和阴影，不要复杂光影或渐变 背景：纯色淡彩背景 线条：线条要求粗犷和抽象 因为后续要做拼豆图的模版';

// 上传图压缩到 maxDim 内（保持比例），避免 base64 payload 过大
function imageToJpegBase64(image: HTMLImageElement, maxDim = 1024, quality = 0.85): string {
  const aspect = image.width / image.height;
  let w = image.width;
  let h = image.height;
  if (w > maxDim || h > maxDim) {
    if (w >= h) { w = maxDim; h = Math.max(1, Math.round(maxDim / aspect)); }
    else { h = maxDim; w = Math.max(1, Math.round(maxDim * aspect)); }
  }
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法获取 canvas context');
  ctx.drawImage(image, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', quality);
}

interface ArkResponse {
  model: string;
  created: number;
  data: Array<{ b64_json?: string; url?: string; size?: string }>;
  usage?: { generated_images?: number; output_tokens?: number; total_tokens?: number };
  error?: { code?: string; message?: string };
}

// 将上传图转为动漫风格，返回 data URL（JPEG）
export async function cartoonifyWithDoubao(image: HTMLImageElement): Promise<string> {
  const apiKey = import.meta.env.VITE_ARK_API_KEY;
  if (!apiKey) {
    throw new Error('未配置 VITE_ARK_API_KEY，请在 .env.local 中设置豆包 API Key');
  }

  const imageBase64 = imageToJpegBase64(image);

  const res = await fetch(ARK_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      prompt: PROMPT,
      image: [imageBase64],
      size: '1K',
      response_format: 'b64_json',
      watermark: false,
    }),
  });

  if (!res.ok) {
    let errMsg = `HTTP ${res.status}`;
    try {
      const errBody = (await res.json()) as ArkResponse;
      if (errBody.error?.message) errMsg = errBody.error.message;
      if (errBody.error?.code) errMsg = `${errBody.error.code}: ${errMsg}`;
    } catch { /* ignore parse error */ }
    throw new Error(friendlyError(res.status, errMsg));
  }

  const body = (await res.json()) as ArkResponse;
  const item = body.data?.[0];
  if (!item) throw new Error('API 未返回图像数据');

  if (item.b64_json) {
    return `data:image/jpeg;base64,${item.b64_json}`;
  }
  if (item.url) {
    // fallback：URL 模式（理论上不会走到，response_format=b64_json）
    const r = await fetch(item.url);
    if (!r.ok) throw new Error(`下载生成图失败: HTTP ${r.status}`);
    const blob = await r.blob();
    return await blobToDataUrl(blob);
  }
  throw new Error('API 返回格式异常：无 b64_json 也无 url');
}

function friendlyError(status: number, msg: string): string {
  if (status === 400 && msg.includes('InputImage')) return '输入图片可能包含敏感信息，请更换图片';
  if (status === 400 && msg.includes('InputText')) return '提示词可能包含敏感信息';
  if (status === 400 && msg.includes('OutputImage')) return '生成的图片可能包含敏感信息，请重试';
  if (status === 429) return '请求排队已达上限，请稍后重试';
  if (status === 401) return 'API Key 无效或已过期';
  return `动漫图生成失败: ${msg}`;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
