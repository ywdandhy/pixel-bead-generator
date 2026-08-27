#!/bin/bash
# 抓汽车图:小米汽车 5 张 + 25 款其他跑车各 1 张
UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

# 格式: 搜索关键词|显示名|数量|额外标签
CARS=(
  # 小米汽车 5 张(取前 5 个不同结果)
  "汽车|小米汽车 SU7 高清|小米汽车|5|小米,轿车"
  # 其他跑车 / 豪车(各 1 张)
  "汽车|保时捷911 跑车 高清|保时捷911|1|保时捷,跑车"
  "汽车|法拉利 跑车 高清|法拉利|1|法拉利,跑车"
  "汽车|兰博基尼 跑车 高清|兰博基尼|1|兰博基尼,跑车"
  "汽车|迈凯伦 跑车 高清|迈凯伦|1|迈凯伦,跑车"
  "汽车|布加迪 跑车 高清|布加迪|1|布加迪,跑车"
  "汽车|玛莎拉蒂 跑车 高清|玛莎拉蒂|1|玛莎拉蒂,跑车"
  "汽车|阿斯顿马丁 跑车 高清|阿斯顿马丁|1|阿斯顿马丁,跑车"
  "汽车|奔驰AMG GT 跑车 高清|奔驰AMG-GT|1|奔驰,跑车"
  "汽车|宝马M3 跑车 高清|宝马M3|1|宝马,跑车"
  "汽车|奥迪R8 跑车 高清|奥迪R8|1|奥迪,跑车"
  "汽车|特斯拉 Model S 跑车 高清|特斯拉Model-S|1|特斯拉,轿车"
  "汽车|蔚来EP9 跑车 高清|蔚来EP9|1|蔚来,跑车"
  "汽车|比亚迪汉 高清|比亚迪汉|1|比亚迪,轿车"
  "汽车|理想L9 高清|理想L9|1|理想,SUV"
  "汽车|蔚来ES8 高清|蔚来ES8|1|蔚来,SUV"
  "汽车|小鹏P7 高清|小鹏P7|1|小鹏,轿车"
  "汽车|问界M9 高清|问界M9|1|问界,SUV"
  "汽车|极氪001 高清|极氪001|1|极氪,轿车"
  "汽车|岚图FREE 高清|岚图FREE|1|岚图,SUV"
  "汽车|阿维塔11 高清|阿维塔11|1|阿维塔,SUV"
  "汽车|路特斯 跑车 高清|路特斯|1|路特斯,跑车"
  "汽车|帕加尼 跑车 高清|帕加尼|1|帕加尼,跑车"
  "汽车|柯尼塞格 跑车 高清|柯尼塞格|1|柯尼塞格,跑车"
  "汽车|雷克萨斯LFA 跑车 高清|雷克萨斯LFA|1|雷克萨斯,跑车"
  "汽车|本田NSX 跑车 高清|本田NSX|1|本田,跑车"
)

for line in "${CARS[@]}"; do
  IFS='|' read -r cat query name count extra_tags <<< "$line"
  count=${count:-1}
  encoded=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$query'))")
  rn=$((count > 1 ? count * 2 : 15))
  url="https://image.baidu.com/search/acjson?tn=resultjson&queryWord=$encoded&word=$encoded&pn=0&rn=$rn&ie=utf-8"

  urls=$(curl -sL --max-time 10 \
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
for item in d.get('data', []):
    if not item: continue
    u = item.get('thumbURL', '')
    if not u or not u.startswith('https://img'): continue
    w = item.get('width', 0) or 0
    h = item.get('height', 0) or 0
    if w < 400 or h < 400: continue
    ratio = w / h if h else 0
    if ratio < 0.5 or ratio > 2.5: continue
    print(u)
")
  IFS=$'\n' read -d '' -ra urlArr <<< "$urls" || true

  tags_str="['$name'"
  if [ -n "$extra_tags" ]; then
    IFS=',' read -ra tag_arr <<< "$extra_tags"
    for t in "${tag_arr[@]}"; do
      tags_str="$tags_str, '$t'"
    done
  fi
  tags_str="$tags_str]"

  if [ "$count" -eq 1 ]; then
    if [ -n "$urlArr" ]; then
      echo "  { name: '$name', category: '$cat', imageUrl: '${urlArr[0]}', tags: $tags_str },"
    else
      echo "  // $name ($cat): 搜索失败"
    fi
  else
    if [ ${#urlArr[@]} -eq 0 ]; then
      echo "  // $name ($cat): 搜索失败"
    else
      idx=0
      for u in "${urlArr[@]}"; do
        idx=$((idx + 1))
        if [ $idx -gt $count ]; then break; fi
        echo "  { name: '$name-$idx', category: '$cat', imageUrl: '$u', tags: $tags_str },"
      done
    fi
  fi
  sleep 0.4
done
