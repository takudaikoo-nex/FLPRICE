const fs = require('fs');

const content = fs.readFileSync('./constants.ts', 'utf8');

let newContent = content.replace(
  /const CREMATION: PlanId\[\] = \['plan_01', 'plan_02'\];\r?\nconst FUNERAL: PlanId\[\] = \['plan_03', 'plan_04', 'plan_05'\];\r?\nconst ALL: PlanId\[\] = \[\.\.\.CREMATION, \.\.\.FUNERAL\];\r?\nconst FUNERAL_FULL: PlanId\[\] = \['plan_04', 'plan_05'\];/,
  `const CREMATION: PlanId[] = ['plan_01', 'plan_07', 'plan_02'];\nconst FUNERAL: PlanId[] = ['plan_06', 'plan_03', 'plan_04', 'plan_05'];\nconst ALL: PlanId[] = [...CREMATION, ...FUNERAL];\nconst FUNERAL_FULL: PlanId[] = ['plan_04', 'plan_05'];`
);

newContent = newContent.replace(
  /export const PLANS: Plan\[\] = \[[\s\S]*?\];/,
  `export const PLANS: Plan[] = [\n  { id: 'plan_05', name: '二日葬プラン', price: 700000, category: 'funeral', description: '通夜・告別式を行い、2日かけてお見送りする一般的なプランです。' },\n  { id: 'plan_04', name: '一日葬プラン', price: 500000, category: 'funeral', description: '通夜を行わず、告別式から火葬までを1日で行うプランです。' },\n  { id: 'plan_06', name: 'こっそり家族葬プラン', price: 350000, category: 'funeral', description: '納棺師をオプションとし、さらに費用を抑えてご自宅でご家族だけでひっそりとお見送りできるプランです。' },\n  { id: 'plan_03', name: 'お別れ自宅葬プラン', price: 400000, category: 'funeral', description: 'ご自宅でご家族だけでお見送りできるプランです。' },\n  { id: 'plan_01', name: 'シンプル直葬プラン', price: 150000, category: 'cremation', description: '費用を最小限に抑え、火葬のみを誠実に行うプランです。' },\n  { id: 'plan_07', name: '面会火葬式プラン', price: 250000, category: 'cremation', description: '火葬の前にお棺の窓越しに最後のご面会ができるプランです。' },\n  { id: 'plan_02', name: 'お別れ火葬式プラン', price: 350000, category: 'cremation', description: '火葬前にお花に囲まれた空間でお別れの時間を持てるプランです。' },\n];`
);

newContent = newContent.replace(/allowedPlans: \['plan_02', 'plan_03', 'plan_04', 'plan_05'\],\s+includedInPlans: \['plan_02', 'plan_03', 'plan_04', 'plan_05'\],/g, 
  `allowedPlans: ['plan_07', 'plan_02', ...FUNERAL],\n    includedInPlans: ['plan_07', 'plan_02', ...FUNERAL],`);

newContent = newContent.replace(/allowedPlans: \['plan_02', 'plan_03', 'plan_04', 'plan_05'\],/g, 
  `allowedPlans: ['plan_02', ...FUNERAL],`);

newContent = newContent.replace(/allowedPlans: \['plan_01', 'plan_02'\],\s+includedInPlans: \['plan_02'\],/g, 
  `allowedPlans: ['plan_01', 'plan_07', 'plan_02'],\n    includedInPlans: ['plan_02'],`);

newContent = newContent.replace(/includedInPlans: \['plan_02', 'plan_03', 'plan_04', 'plan_05'\],/g, 
  `includedInPlans: ['plan_02', ...FUNERAL],`);

newContent = newContent.replace(/includedInPlans: FUNERAL, \/\/ 葬儀プランでは含まれる/g, 
  `includedInPlans: ['plan_03', 'plan_04', 'plan_05'], // 葬儀プラン(こっそり家族葬以外)では含まれる`);

newContent = newContent.replace(/allowedPlans: \['plan_03'\],\s+includedInPlans: \['plan_03'\], \/\/ お別れ自宅葬プランに含む/g, 
  `allowedPlans: ['plan_06', 'plan_03'],\n    includedInPlans: ['plan_06', 'plan_03'], // こっそり家族葬・お別れ自宅葬プランに含む`);

fs.writeFileSync('./constants.ts', newContent);
console.log('constants.ts updated');
