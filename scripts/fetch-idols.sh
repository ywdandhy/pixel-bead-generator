#!/bin/bash
# 抓 20 个爱豆 × 5 风格 = 100 张图,输出 TS 条目
# Q版1/写实1 取第 1 个结果,Q版2/写实2 取第 2 个(避免重复)
UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

IDOLS=(
  "肖战" "王一博" "易烊千玺" "王俊凯" "王源" "张艺兴"
  "宋亚轩" "刘耀文" "马嘉祺" "严浩翔" "贺峻霖"
  "檀健次" "邓为" "陈哲远" "吴磊" "白敬亭" "朱一龙" "李现" "张凌赫" "王鹤棣"
)

# 格式: 搜索关键词后缀|name 后缀|额外标签(逗号分隔)|取第 N 个结果(0-based)
STYLES=(
  "Q版 卡通 头像|Q版1|Q版,头像|0"
  "Q版 卡通 头像|Q版2|Q版,头像|1"
  "写真 高清|写实1|写实,头像|0"
  "写真 高清|写实2|写实,头像|1"
  "呆萌 可爱|呆萌|呆萌,头像|0"
)

for name in "${IDOLS[@]}"; do
  for style in "${STYLES[@]}"; do
    IFS='|' read -r query_suffix name_suffix extra_tags result_idx <<< "$style"
    full_query="$name $query_suffix"
    encoded=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$full_query'))")
    url="https://image.baidu.com/search/acjson?tn=resultjson&queryWord=$encoded&word=$encoded&pn=0&rn=15&ie=utf-8"

    best=$(curl -sL --max-time 10 \
      -A "$UA" \
      -H 'Accept: application/json, text/plain, */*' \
      -H 'Accept-Language: zh-CN,zh;q=0.9' \
      -H 'Referer: https://image.baidu.com/' \
      "$url" | python3 -c "
import sys, re, json
raw = sys.stdin.read()
fixed = re.sub(r',(\s*[}\]])', r'\1', raw)
try:
    d = json.loads(fixed)
except Exception:
    sys.exit()
target = $result_idx
seen = 0
for item in d.get('data', []):
    if not item: continue
    u = item.get('thumbURL', '')
    if not u or not u.startswith('https://img'): continue
    w = item.get('width', 0) or 0
    h = item.get('height', 0) or 0
    if w < 400 or h < 400: continue
    ratio = w / h if h else 0
    if ratio < 0.5 or ratio > 2.0: continue
    if seen == target:
        print(u)
        break
    seen += 1
")
    tags_str="['$name'"
    if [ -n "$extra_tags" ]; then
      IFS=',' read -ra tag_arr <<< "$extra_tags"
      for t in "${tag_arr[@]}"; do
        tags_str="$tags_str, '$t'"
      done
    fi
    tags_str="$tags_str]"

    if [ -n "$best" ]; then
      echo "  { name: '$name-$name_suffix', category: '爱豆', imageUrl: '$best', tags: $tags_str },"
    else
      echo "  // $name-$name_suffix (爱豆): 搜索失败"
    fi
    sleep 0.4
  done
done
