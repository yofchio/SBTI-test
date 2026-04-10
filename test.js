// GPTI 电竞人格测试 — 自动化测试
// 用 Node.js 运行: node test.js

const fs = require('fs');
const html = fs.readFileSync('./index.html', 'utf8');

// 提取 JS 代码
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) { console.error('ERROR: No <script> tag found'); process.exit(1); }

// 模拟浏览器 DOM 环境（最小化）
const mockElements = {};
const makeMockEl = () => ({
  classList: { toggle: ()=>{}, add: ()=>{}, remove: ()=>{} },
  querySelectorAll: () => [],
  addEventListener: ()=>{},
  innerHTML: '', textContent: '', style: {}, src: '', alt: '',
  disabled: false, removeAttribute: ()=>{}
});
const mockDOM = {
  getElementById: (id) => mockElements[id] || (mockElements[id] = makeMockEl()),
  createElement: (tag) => ({
    className: '', innerHTML: '',
    appendChild: ()=>{}, querySelectorAll: () => []
  })
};
const mockWindow = { scrollTo: ()=>{} };

// 在隔离环境中执行 JS，提取数据
const ctx = { document: mockDOM, window: mockWindow };
const wrappedCode = `
  (function(document, window) {
    ${scriptMatch[1]}
    return { dimensionMeta, questions, specialQuestions, PLAYER_GAMES, TYPE_LIBRARY,
      TYPE_IMAGES, NORMAL_TYPES, DIM_EXPLANATIONS, dimensionOrder,
      NETBAR_TRIGGER_QUESTION_ID, sumToLevel, levelNum, parsePattern, computeResult, app };
  })
`;

let extracted;
try {
  const fn = eval(wrappedCode);
  extracted = fn(mockDOM, mockWindow);
} catch(e) {
  console.error('JS执行失败:', e.message);
  process.exit(1);
}

const { dimensionMeta, questions, specialQuestions, PLAYER_GAMES, TYPE_LIBRARY,
  TYPE_IMAGES, NORMAL_TYPES, DIM_EXPLANATIONS, dimensionOrder,
  NETBAR_TRIGGER_QUESTION_ID, sumToLevel, levelNum, parsePattern, computeResult, app } = extracted;

let passed = 0;
let failed = 0;
const errors = [];

function assert(condition, msg) {
  if (condition) { passed++; }
  else { failed++; errors.push(msg); console.error('  FAIL: ' + msg); }
}

console.log('=== GPTI 电竞人格测试 — 测试开始 ===\n');

// ====== 1. 数据完整性 ======
console.log('【1】数据完整性');

assert(Object.keys(dimensionMeta).length === 15, `dimensionMeta 应有15个维度，实际 ${Object.keys(dimensionMeta).length}`);
assert(dimensionOrder.length === 15, `dimensionOrder 应有15项，实际 ${dimensionOrder.length}`);
assert(questions.length === 20, `questions 应有20题，实际 ${questions.length}`);
assert(specialQuestions.length === 2, `specialQuestions 应有2题，实际 ${specialQuestions.length}`);
assert(Object.keys(TYPE_LIBRARY).length === 29, `TYPE_LIBRARY 应有29个选手，实际 ${Object.keys(TYPE_LIBRARY).length}`);
assert(NORMAL_TYPES.length === 27, `NORMAL_TYPES 应有27个可匹配选手，实际 ${NORMAL_TYPES.length}`);
assert(Object.keys(DIM_EXPLANATIONS).length === 15, `DIM_EXPLANATIONS 应有15个维度，实际 ${Object.keys(DIM_EXPLANATIONS).length}`);
assert(Object.keys(TYPE_IMAGES).length === 29, `TYPE_IMAGES 应有29项，实际 ${Object.keys(TYPE_IMAGES).length}`);
assert(Object.keys(PLAYER_GAMES).length === 29, `PLAYER_GAMES 应有29项，实际 ${Object.keys(PLAYER_GAMES).length}`);

// ====== 2. 维度一致性 ======
console.log('【2】维度一致性');

dimensionOrder.forEach(dim => {
  assert(dimensionMeta[dim], `dimensionOrder 中的 ${dim} 应在 dimensionMeta 中存在`);
  assert(DIM_EXPLANATIONS[dim], `dimensionOrder 中的 ${dim} 应在 DIM_EXPLANATIONS 中存在`);
  if (DIM_EXPLANATIONS[dim]) {
    assert(DIM_EXPLANATIONS[dim].L, `DIM_EXPLANATIONS.${dim} 缺少 L 级别`);
    assert(DIM_EXPLANATIONS[dim].M, `DIM_EXPLANATIONS.${dim} 缺少 M 级别`);
    assert(DIM_EXPLANATIONS[dim].H, `DIM_EXPLANATIONS.${dim} 缺少 H 级别`);
  }
});

// ====== 3. 题目验证 ======
console.log('【3】题目验证');

const dimQuestionCount = {};
questions.forEach(q => {
  assert(q.id && q.dim && q.text && q.options, `题目 ${q.id} 缺少必要字段`);
  assert(dimensionMeta[q.dim], `题目 ${q.id} 的维度 ${q.dim} 不存在于 dimensionMeta`);
  assert(q.options.length >= 3, `题目 ${q.id} 选项数不足3个`);
  q.options.forEach((opt, i) => {
    assert(opt.label && opt.value !== undefined, `题目 ${q.id} 选项 ${i} 缺少 label 或 value`);
  });
  dimQuestionCount[q.dim] = (dimQuestionCount[q.dim] || 0) + 1;
});

const twoDims = ['M1','S2','S3','F1','F2'];
dimensionOrder.forEach(dim => {
  const expected = twoDims.includes(dim) ? 2 : 1;
  assert(dimQuestionCount[dim] === expected, `维度 ${dim} 应有${expected}题，实际 ${dimQuestionCount[dim] || 0} 题`);
});

// ====== 4. 特殊问题验证 ======
console.log('【4】特殊问题验证');

assert(specialQuestions[0].id === 'netcafe_gate_q1', `第一个特殊题ID应为 netcafe_gate_q1`);
assert(specialQuestions[1].id === 'netcafe_gate_q2', `第二个特殊题ID应为 netcafe_gate_q2`);
assert(NETBAR_TRIGGER_QUESTION_ID === 'netcafe_gate_q2', `触发器ID应为 netcafe_gate_q2`);

// ====== 5. TYPE_LIBRARY 验证 ======
console.log('【5】TYPE_LIBRARY 选手数据验证');

Object.entries(TYPE_LIBRARY).forEach(([code, entry]) => {
  assert(entry.code === code, `TYPE_LIBRARY["${code}"].code 应为 "${code}"，实际 "${entry.code}"`);
  assert(entry.cn && entry.cn.length > 0, `${code} 缺少 cn（中文标签）`);
  assert(entry.intro && entry.intro.length > 0, `${code} 缺少 intro`);
  assert(entry.desc && entry.desc.length > 20, `${code} 的 desc 太短或缺失（长度: ${(entry.desc||'').length}）`);
});

// NETBAR 和 RANDOM 必须存在
assert(TYPE_LIBRARY.NETBAR, 'TYPE_LIBRARY 缺少 NETBAR（网吧战神）');
assert(TYPE_LIBRARY.RANDOM, 'TYPE_LIBRARY 缺少 RANDOM（随机路人王）');

// ====== 6. NORMAL_TYPES pattern 验证 ======
console.log('【6】NORMAL_TYPES pattern 验证');

NORMAL_TYPES.forEach(nt => {
  assert(TYPE_LIBRARY[nt.code], `NORMAL_TYPES 中的 ${nt.code} 不在 TYPE_LIBRARY 中`);
  const parsed = parsePattern(nt.pattern);
  assert(parsed.length === 15, `${nt.code} 的 pattern 解析后应为15个字符，实际 ${parsed.length}（pattern: ${nt.pattern}）`);
  parsed.forEach((ch, i) => {
    assert(['L','M','H'].includes(ch), `${nt.code} pattern 位置 ${i} 出现非法字符 "${ch}"`);
  });
});

// NETBAR 和 RANDOM 不应在 NORMAL_TYPES 中
assert(!NORMAL_TYPES.find(nt => nt.code === 'NETBAR'), 'NETBAR 不应在 NORMAL_TYPES 中');
assert(!NORMAL_TYPES.find(nt => nt.code === 'RANDOM'), 'RANDOM 不应在 NORMAL_TYPES 中');

// ====== 7. PLAYER_GAMES 验证 ======
console.log('【7】PLAYER_GAMES 游戏标签验证');

const validGames = ['VAL', 'CS', 'LOL', 'ALL'];
Object.entries(PLAYER_GAMES).forEach(([code, game]) => {
  assert(TYPE_LIBRARY[code], `PLAYER_GAMES 中的 ${code} 不在 TYPE_LIBRARY 中`);
  assert(validGames.includes(game), `${code} 的游戏标签 "${game}" 不合法`);
});

// ====== 8. TYPE_IMAGES 验证 ======
console.log('【8】TYPE_IMAGES 图片文件验证');

const imageFiles = fs.readdirSync('./image/');
let missingImages = [];
Object.entries(TYPE_IMAGES).forEach(([code, path]) => {
  const filename = path.replace('./image/', '');
  const exists = imageFiles.includes(filename);
  if (!exists) { missingImages.push(filename); }
  assert(TYPE_LIBRARY[code], `TYPE_IMAGES 中的 ${code} 不在 TYPE_LIBRARY 中`);
});
if (missingImages.length > 0) {
  console.log(`  提示: ${missingImages.length} 张图片文件缺失: ${missingImages.join(', ')}`);
}

// ====== 9. 匹配算法模拟测试 ======
console.log('【9】匹配算法模拟测试');

// 测试1: 全选A (value=1) — 应倾向L型选手
app.answers = {};
questions.forEach(q => { app.answers[q.id] = 1; });
const resultAllA = computeResult();
assert(resultAllA.finalType && resultAllA.finalType.code, '全选A: 应能计算出结果');
assert(resultAllA.bestNormal.similarity >= 0 && resultAllA.bestNormal.similarity <= 100, '全选A: 相似度应在0-100之间');
console.log(`  全选A → ${resultAllA.finalType.code}（${resultAllA.finalType.cn}），匹配度 ${resultAllA.bestNormal.similarity}%`);

// 测试2: 全选C (value=3) — 应倾向H型选手
app.answers = {};
questions.forEach(q => { app.answers[q.id] = 3; });
const resultAllC = computeResult();
assert(resultAllC.finalType && resultAllC.finalType.code, '全选C: 应能计算出结果');
console.log(`  全选C → ${resultAllC.finalType.code}（${resultAllC.finalType.cn}），匹配度 ${resultAllC.bestNormal.similarity}%`);

// 测试3: 全选B (value=2) — 应倾向M型选手
app.answers = {};
questions.forEach(q => { app.answers[q.id] = 2; });
const resultAllB = computeResult();
assert(resultAllB.finalType && resultAllB.finalType.code, '全选B: 应能计算出结果');
console.log(`  全选B → ${resultAllB.finalType.code}（${resultAllB.finalType.cn}），匹配度 ${resultAllB.bestNormal.similarity}%`);

// 测试4: NETBAR 触发
app.answers = {};
questions.forEach(q => { app.answers[q.id] = 2; });
app.answers['netcafe_gate_q2'] = 2;
const resultNetbar = computeResult();
assert(resultNetbar.finalType.code === 'NETBAR', `网吧触发: 应为 NETBAR，实际 ${resultNetbar.finalType.code}`);
assert(resultNetbar.special === true, '网吧触发: special 应为 true');
console.log(`  网吧触发 → ${resultNetbar.finalType.code}（${resultNetbar.finalType.cn}）`);

// ====== 10. 选手可达性测试 ======
console.log('【10】选手可达性测试（蒙特卡洛模拟 5000 次）');

const reachCount = {};
NORMAL_TYPES.forEach(nt => { reachCount[nt.code] = 0; });

for (let trial = 0; trial < 5000; trial++) {
  app.answers = {};
  questions.forEach(q => {
    const opts = q.options.map(o => o.value);
    app.answers[q.id] = opts[Math.floor(Math.random() * opts.length)];
  });
  const r = computeResult();
  if (r.finalType.code !== 'RANDOM' && r.finalType.code !== 'NETBAR') {
    reachCount[r.finalType.code] = (reachCount[r.finalType.code] || 0) + 1;
  }
}

const unreachable = [];
const reachStats = [];
NORMAL_TYPES.forEach(nt => {
  if (reachCount[nt.code] === 0) unreachable.push(nt.code);
  reachStats.push({ code: nt.code, count: reachCount[nt.code] });
});

reachStats.sort((a, b) => b.count - a.count);
console.log('  选手匹配分布 (5000次随机):');
reachStats.forEach(s => {
  const bar = '█'.repeat(Math.round(s.count / 50));
  console.log(`    ${s.code.padEnd(12)} ${String(s.count).padStart(4)} 次 ${bar}`);
});

if (unreachable.length > 0) {
  console.error(`  WARNING: ${unreachable.length} 个选手在5000次随机中从未被匹配到: ${unreachable.join(', ')}`);
}
assert(unreachable.length === 0, `有 ${unreachable.length} 个选手无法被匹配到: ${unreachable.join(', ')}`);

// ====== 11. Pattern 冲突检测 ======
console.log('【11】Pattern 冲突检测');

const patternMap = {};
let duplicatePatterns = [];
NORMAL_TYPES.forEach(nt => {
  if (patternMap[nt.pattern]) {
    duplicatePatterns.push(`${patternMap[nt.pattern]} 和 ${nt.code} 共享 pattern ${nt.pattern}`);
  }
  patternMap[nt.pattern] = nt.code;
});

if (duplicatePatterns.length > 0) {
  duplicatePatterns.forEach(d => console.error('  WARNING: ' + d));
}
assert(duplicatePatterns.length === 0, `有 ${duplicatePatterns.length} 对选手共享相同 pattern`);

// ====== 12. sumToLevel 函数验证 ======
console.log('【12】评分函数验证');

assert(sumToLevel(2) === 'L', 'sumToLevel(2) 应为 L');
assert(sumToLevel(3) === 'L', 'sumToLevel(3) 应为 L');
assert(sumToLevel(4) === 'M', 'sumToLevel(4) 应为 M');
assert(sumToLevel(5) === 'H', 'sumToLevel(5) 应为 H');
assert(sumToLevel(6) === 'H', 'sumToLevel(6) 应为 H');
assert(levelNum('L') === 1, 'levelNum(L) 应为 1');
assert(levelNum('M') === 2, 'levelNum(M) 应为 2');
assert(levelNum('H') === 3, 'levelNum(H) 应为 3');

// ====== 总结 ======
console.log('\n=== 测试结果 ===');
console.log(`通过: ${passed}  失败: ${failed}`);
if (errors.length > 0) {
  console.log('\n失败项:');
  errors.forEach((e, i) => console.log(`  ${i+1}. ${e}`));
}
if (missingImages.length > 0) {
  console.log(`\n需要补充的图片 (${missingImages.length}张): ${missingImages.join(', ')}`);
}
process.exit(failed > 0 ? 1 : 0);
