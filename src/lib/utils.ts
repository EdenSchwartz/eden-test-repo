import { createCn } from "cn/config"

// cn() that knows the demo's own text sizes (index.css @theme: text-small 12, text-body 14, text-title 20), so they
// aren't mistaken for colours and dropped next to one (text-small + text-white would otherwise lose the size)
export const cn = createCn({ extend: { classGroups: { "font-size": [{ text: ["small", "body", "title"] }] } } })
