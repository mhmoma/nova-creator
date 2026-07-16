(() => {
  const NAV = [
    ['sec-basic', '基本信息'],
    ['sec-world', '世界观'],
    ['sec-chars', '角色设定'],
    ['sec-opening', '开场白'],
    ['sec-player', '玩家角色'],
    ['sec-platform', '平台主字段'],
    ['sec-statusbar', '文本状态栏'],
    ['sec-extra', '额外需求'],
    ['sec-preview', '预览导出'],
  ];

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  function val(id) {
    const el = document.getElementById(id);
    return el ? String(el.value || '').trim() : '';
  }

  function checked(id) {
    const el = document.getElementById(id);
    return !!(el && el.checked);
  }

  function fence(text) {
    return '```\n' + (text || '').trim() + '\n```';
  }

  function esc(s) {
    return String(s || '').replace(/\r\n/g, '\n');
  }

  function workNameSafe() {
    return val('workName') || '作品名称';
  }

  function defaultCover() {
    const name = workNameSafe();
    return val('coverPath') || `封面图/${name}.png`;
  }

  function buildNav() {
    const nav = $('#railNav');
    nav.innerHTML = '';
    NAV.forEach(([id, label], i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.target = id;
      btn.textContent = `${String(i + 1).padStart(2, '0')}  ${label}`;
      btn.addEventListener('click', () => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      nav.appendChild(btn);
    });

    const buttons = $$('#railNav button');
    const sections = $$('[data-nav]');
    const setActive = (id) => {
      buttons.forEach((b) => b.classList.toggle('active', b.dataset.target === id));
    };
    setActive(sections[0]?.id);

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(
        (entries) => {
          const hit = entries
            .filter((e) => e.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
          if (hit) setActive(hit.target.id);
        },
        { threshold: 0.35, rootMargin: '-18% 0px -45% 0px' }
      );
      sections.forEach((s) => io.observe(s));
    }
  }

  function addCharacter(preset = {}) {
    const tpl = $('#tpl-char');
    const node = tpl.content.firstElementChild.cloneNode(true);
    if (preset.name) $('.c-name', node).value = preset.name;
    if (preset.role) $('.c-role', node).value = preset.role;
    if (preset.gender) $('.c-gender', node).value = preset.gender;
    if (preset.age) $('.c-age', node).value = preset.age;
    if (preset.template) $('.c-template', node).value = preset.template;
    if (preset.outline) $('.c-outline', node).value = preset.outline;
    $('.char-remove', node).addEventListener('click', () => node.remove());
    $('#charList').appendChild(node);
    renumberChars();
  }

  function renumberChars() {
    $$('#charList .char-card').forEach((card, i) => {
      $('.char-label', card).textContent = `角色 ${i + 1}`;
    });
  }

  function collectChars() {
    return $$('#charList .char-card').map((card) => ({
      name: $('.c-name', card).value.trim() || '未命名',
      role: $('.c-role', card).value,
      gender: $('.c-gender', card).value.trim(),
      age: $('.c-age', card).value.trim(),
      template: $('.c-template', card).value,
      outline: $('.c-outline', card).value.trim(),
    }));
  }

  function buildMarkdown() {
    const name = workNameSafe();
    const cover = defaultCover();
    const creator = val('creatorName');
    const chars = collectChars();
    const lines = [];

    lines.push('# 角色卡创作任务清单');
    lines.push('');
    lines.push('> ⚠️ **写卡 AI 铁律（必读）**：');
    lines.push('> 1. 本清单正文为**只读需求**，禁止改写、扩写、删减、重排任何设定内容。');
    lines.push('> 2. **仅允许**更新文末进度勾选 `[ ]`/`[x]`。');
    lines.push('> 3. 每步开写前必须打开对应「参考模板」全文，禁止凭记忆写作。');
    lines.push('> 4. 文本状态栏与 `post_history_instructions` 只能用 `基础模板/Z.7.*`，禁止自创宏或自写最高指令。');
    lines.push('> 5. `system_prompt` / `description` 分工见 `Z.8`；总规范：`基础模板/写卡AI执行规范.md`');
    lines.push('> 6. 本清单由 **平台写卡清单工坊**（`platform-card-studio.html`）生成，无 MVU 变量流程。');
    lines.push('');
    lines.push('> 📁 **文件组织**：');
    lines.push(`> - 在 \`作品\` 下创建 \`${name}\` 文件夹`);
    lines.push(`> - 将本清单（\`${safeFileName(name)}.md\`）放入该文件夹`);
    lines.push('> - 所有成品放入同一文件夹');
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## 基本信息');
    lines.push('');
    lines.push(`**作品名称：** ${name}`);
    lines.push('');
    lines.push(`**清单文件名：** \`${safeFileName(name)}.md\``);
    lines.push('');
    lines.push(`**作品类型：** ${val('workType') || '_[待填写]_'}`);
    lines.push('');
    lines.push(`**封面图路径：** \`${cover}\``);
    if (creator) {
      lines.push('');
      lines.push(`**创作者：** ${creator}`);
    }
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## 创作任务清单');
    lines.push('');

    let step = 1;

    if (checked('needBackground')) {
      lines.push(`### ✅ 第${step}步：世界观构建`);
      lines.push('');
      lines.push(`- **时代/时期：** ${val('bgEra') || '_[待填写]_'}`);
      lines.push(`- **主要地点：** ${val('bgLocation') || '_[待填写]_'}`);
      lines.push('');
      lines.push('- **背景描述：**');
      lines.push(fence(val('bgDescription') || '_[待填写]_'));
      lines.push('');
      lines.push('- **特殊规则/系统：**');
      lines.push(fence(val('bgRules') || '无'));
      lines.push('');
      if (val('bgExtra')) {
        lines.push('- **补充说明：**');
        lines.push(fence(val('bgExtra')));
        lines.push('');
      }
      lines.push('**参考模板：** `基础模板/Z.1.背景模板.md`');
      lines.push('');
      lines.push('**成品路径：** `作品/' + name + '/背景设定.xyaml`');
      lines.push('');
      step += 1;
    }

    if (checked('needCharacters')) {
      lines.push(`### ✅ 第${step}步：角色设定（写入世界书）`);
      lines.push('');
      lines.push(`**主要角色数量：** ${Math.max(chars.length, 1)}`);
      lines.push('');
      chars.forEach((c, i) => {
        lines.push(`#### 角色 ${i + 1}`);
        lines.push('');
        lines.push(`- **定位：** ${c.role}`);
        lines.push(`- **姓名：** ${c.name}`);
        if (c.gender) lines.push(`- **性别：** ${c.gender}`);
        if (c.age) lines.push(`- **年龄：** ${c.age}`);
        lines.push(
          `- **模板：** ${c.template === 'brief' ? '简要版（Z.2 简要）' : '原版完整（Z.2）'}`
        );
        lines.push('');
        lines.push('- **人物设定大纲：**');
        lines.push(fence(c.outline || '_[待填写]_'));
        lines.push('');
        lines.push(
          `**参考模板：** \`${
            c.template === 'brief'
              ? '基础模板/Z.2.人物模板-简要版.md'
              : '基础模板/Z.2.人物模板.md'
          }\``
        );
        lines.push('');
        lines.push(`**成品路径：** \`作品/${name}/角色设定_${c.name}.xyaml\``);
        lines.push('');
      });
      if (!chars.length) {
        lines.push('_尚未添加角色，请至少补充一名。_');
        lines.push('');
      }
      step += 1;
    }

    if (checked('needOpening')) {
      lines.push(`### ✅ 第${step}步：开场白`);
      lines.push('');
      lines.push(`- **开场场景：** ${val('openingScene') || '_[待填写]_'}`);
      lines.push(`- **目标篇幅：** ${val('openingLength')}`);
      lines.push(`- **时间：** ${val('openingTime') || '_[待填写]_'}`);
      lines.push(`- **地点：** ${val('openingLocation') || '_[待填写]_'}`);
      lines.push(`- **氛围：** ${val('openingAtmosphere') || '_[待填写]_'}`);
      lines.push(`- **与 {{user}} 的关系：** ${val('openingUserRelation') || '_[待填写]_'}`);
      lines.push('');
      lines.push('- **初始情境/冲突：**');
      lines.push(fence(val('openingConflict') || '_[待填写]_'));
      lines.push('');
      if (checked('needStatusBar')) {
        lines.push(
          '- **状态栏锚点：** 开场白正文末尾必须追加一组已填好的「角色深度扫描」状态栏（格式见 Z.7）。'
        );
        lines.push('');
      }
      lines.push('**参考模板：** `基础模板/Z.3.开场白.md`');
      lines.push('');
      lines.push(`**成品路径：** \`作品/${name}/开场白.md\``);
      lines.push('');
      step += 1;
    }

    if (checked('needPlayer')) {
      lines.push(`### ✅ 第${step}步：玩家角色设定`);
      lines.push('');
      lines.push(`- **设定深度：** ${val('playerDepth')}`);
      lines.push('');
      lines.push('- **玩家角色大纲：**');
      lines.push(fence(val('playerOutline') || '_[待填写]_'));
      lines.push('');
      lines.push('**参考模板：** `基础模板/Z.6.玩家模板.md`');
      lines.push('');
      lines.push(`**成品路径：** \`作品/${name}/玩家角色_{{user}}.xyaml\``);
      lines.push('');
      step += 1;
    }

    if (checked('needOverview')) {
      lines.push(`### ✅ 第${step}步：作品概述（平台 description）`);
      lines.push('');
      lines.push(
        '多角色作品：本栏写「概述 + 角色一览」，详细人设留在世界书。禁止把完整 xyaml 粘进 description。'
      );
      lines.push('');
      lines.push('- **概述要点：**');
      lines.push(fence(val('overviewHints') || '_[待填写]_'));
      lines.push('');
      lines.push('**参考模板：** `基础模板/Z.8.作品概述.md`');
      lines.push('');
      lines.push(`**成品路径：** \`作品/${name}/作品简介.md\``);
      lines.push('');
      lines.push(`**YAML 映射：** \`fields.description: 作品/${name}/作品简介.md\``);
      lines.push('');
      step += 1;
    }

    if (checked('needSystem')) {
      lines.push(`### ✅ 第${step}步：系统指令（平台 system_prompt）`);
      lines.push('');
      lines.push(
        '对应发布平台「系统指令」栏。只写扮演规则、视角、文风、禁止项；状态栏铁律不要写在这里。'
      );
      lines.push('');
      lines.push('- **文风与扮演要求：**');
      lines.push(fence(val('systemHints') || '_[待填写]_'));
      lines.push('');
      lines.push('**参考模板：** `基础模板/Z.8.系统指令.md`');
      lines.push('');
      lines.push(`**成品路径：** \`作品/${name}/系统指令.md\``);
      lines.push('');
      lines.push(`**YAML 映射：** \`fields.system_prompt: 作品/${name}/系统指令.md\``);
      lines.push('');
      step += 1;
    }

    if (checked('needScenario')) {
      lines.push(`### ✅ 第${step}步：场景摘要（scenario）`);
      lines.push('');
      lines.push('- **场景要点：**');
      lines.push(fence(val('scenarioHints') || '_[待填写]_'));
      lines.push('');
      lines.push(`**成品路径：** \`作品/${name}/场景设定.md\``);
      lines.push('');
      lines.push(`**YAML 映射：** \`fields.scenario: 作品/${name}/场景设定.md\``);
      lines.push('');
      step += 1;
    }

    if (checked('needStatusBar')) {
      lines.push(`### ✅ 第${step}步：文本状态栏`);
      lines.push('');
      lines.push('- 复制 `基础模板/Z.7.状态栏.xyaml` → `作品/' + name + '/状态栏.xyaml`（只改正确示范）。');
      lines.push(
        '- 复制 Z.7 标准铁律 → `作品/' + name + '/状态栏最高指令.md`（禁止自创、禁止一字不差输出世界书）。'
      );
      lines.push('- 世界书条目 `comment` 必须为：`角色深度扫描`。');
      lines.push('- **不要**填写 `extensions.status_bar`（那是 MVU HTML 路线）。');
      if (val('statusFocus')) {
        lines.push('');
        lines.push('- **焦点角色说明：**');
        lines.push(fence(val('statusFocus')));
      }
      lines.push('');
      lines.push('**参考模板：** `基础模板/Z.7.状态栏模板.md` + `基础模板/Z.7.状态栏.xyaml`');
      lines.push('');
      step += 1;
    }

    lines.push('## 额外需求');
    lines.push('');
    lines.push(fence(val('extraNotes') || '无'));
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## 创作进度跟踪');
    lines.push('');
    if (checked('needBackground')) lines.push('- [ ] 背景设定完成');
    if (checked('needCharacters')) lines.push('- [ ] 角色设定完成');
    if (checked('needOpening')) lines.push('- [ ] 开场白完成');
    if (checked('needPlayer')) lines.push('- [ ] 玩家角色完成');
    if (checked('needOverview')) lines.push('- [ ] 作品概述（description）完成');
    if (checked('needSystem')) lines.push('- [ ] 系统指令完成');
    if (checked('needScenario')) lines.push('- [ ] 场景设定完成');
    if (checked('needStatusBar')) lines.push('- [ ] 文本状态栏 + 最高指令完成');
    lines.push('- [ ] 编写打包配置文件');
    lines.push('- [ ] 运行 `node build-card.js ' + name + '.yaml`');
    lines.push('- [ ] 运行 `node build-card-png.js ' + name + '.yaml`（如需 PNG）');
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## 打包配置示例');
    lines.push('');
    lines.push('在项目根目录创建 `' + name + '.yaml`：');
    lines.push('');
    lines.push('```yaml');
    lines.push(`name: ${name}`);
    lines.push(`creator: "${creator}"`);
    lines.push('character_version: "1.0"');
    lines.push(`cover: ${cover}`);
    lines.push('fields:');
    lines.push(
      checked('needOverview')
        ? `  description: 作品/${name}/作品简介.md`
        : '  description: ""'
    );
    lines.push('  personality: ""');
    lines.push(
      checked('needScenario')
        ? `  scenario: 作品/${name}/场景设定.md`
        : '  scenario: ""'
    );
    lines.push(
      checked('needOpening')
        ? `  first_mes: 作品/${name}/开场白.md`
        : '  first_mes: ""'
    );
    lines.push('  mes_example: ""');
    lines.push('  creator_notes: ""');
    lines.push(
      checked('needSystem')
        ? `  system_prompt: 作品/${name}/系统指令.md`
        : '  system_prompt: ""'
    );
    lines.push(
      checked('needStatusBar')
        ? `  post_history_instructions: 作品/${name}/状态栏最高指令.md`
        : '  post_history_instructions: ""'
    );
    lines.push('extensions:');
    lines.push('  talkativeness: "0.5"');
    lines.push('  fav: false');
    lines.push(`  world: ${name}`);
    lines.push('  # 文本状态栏路线勿启用 status_bar');
    lines.push('character_book:');
    lines.push(`  name: ${name}`);
    lines.push('  entries:');

    let orderBefore = 1;
    if (checked('needBackground')) {
      lines.push('    - comment: "背景设定"');
      lines.push(`      content: 作品/${name}/背景设定.xyaml`);
      lines.push('      enabled: true');
      lines.push('      position: before_char');
      lines.push(`      insertion_order: ${orderBefore++}`);
      lines.push('      depth: 4');
      lines.push('      role: 0');
      lines.push('');
    }
    if (checked('needPlayer')) {
      lines.push('    - comment: "玩家角色_{{user}}"');
      lines.push(`      content: 作品/${name}/玩家角色_{{user}}.xyaml`);
      lines.push('      enabled: true');
      lines.push('      position: before_char');
      lines.push(`      insertion_order: ${orderBefore++}`);
      lines.push('      depth: 4');
      lines.push('      role: 0');
      lines.push('');
    }
    if (checked('needStatusBar')) {
      lines.push('    - comment: "角色深度扫描"');
      lines.push(`      content: 作品/${name}/状态栏.xyaml`);
      lines.push('      enabled: true');
      lines.push('      position: after_char');
      lines.push('      insertion_order: 0');
      lines.push('      depth: 4');
      lines.push('      role: 0');
      lines.push('');
    }
    if (checked('needCharacters')) {
      chars.forEach((c, i) => {
        lines.push(`    - comment: "角色设定_${c.name}"`);
        lines.push(`      content: 作品/${name}/角色设定_${c.name}.xyaml`);
        lines.push('      enabled: true');
        lines.push('      position: after_char');
        lines.push(`      insertion_order: ${i + 1}`);
        lines.push('      depth: 4');
        lines.push('      role: 0');
        lines.push('');
      });
    }
    lines.push('```');
    lines.push('');
    lines.push('**参考：** `config.example.yaml` · `基础模板/写卡AI执行规范.md`');
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push(`**生成时间：** ${new Date().toISOString().slice(0, 10)}`);
    lines.push('');

    return lines.join('\n');
  }

  function safeFileName(name) {
    const raw = String(name || '作品').trim() || '作品';
    return raw.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim();
  }

  function listFileName() {
    return `${safeFileName(workNameSafe())}.md`;
  }

  function downloadMarkdown(content) {
    const name = workNameSafe();
    const file = listFileName();
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file;
    a.click();
    URL.revokeObjectURL(url);

    const tip = document.createElement('p');
    tip.className = 'hint';
    tip.textContent = `已下载 ${file}。请保存到 作品/${name}/${file}`;
    $('#sec-preview').appendChild(tip);
    setTimeout(() => tip.remove(), 6000);
  }

  function generate() {
    if (!val('workName')) {
      alert('请先填写作品名称');
      $('#workName')?.focus();
      return;
    }
    const md = buildMarkdown();
    const pre = $('#previewOut');
    pre.hidden = false;
    pre.textContent = md;
    downloadMarkdown(md);
    $('#sec-preview').scrollIntoView({ behavior: 'smooth' });
  }

  function resetForm() {
    if (!confirm('确定清空表单？')) return;
    $$('input[type="text"], textarea').forEach((el) => {
      el.value = '';
    });
    $$('input[type="checkbox"]').forEach((el) => {
      el.checked = el.id !== 'needStatusBar' ? true : true;
    });
    $('#openingLength').value = '标准场景（500-800字）';
    $('#playerDepth').value = '简化设定（有基本框架）';
    $('#charList').innerHTML = '';
    addCharacter();
    $('#previewOut').hidden = true;
    $('#previewOut').textContent = '';
  }

  function bindCoverHint() {
    $('#workName')?.addEventListener('input', () => {
      const path = $('#coverPath');
      if (path && !path.dataset.touched) {
        const n = val('workName');
        path.value = n ? `封面图/${n}.png` : '';
      }
    });
    $('#coverPath')?.addEventListener('input', () => {
      $('#coverPath').dataset.touched = '1';
    });
  }

  function init() {
    buildNav();
    bindCoverHint();
    addCharacter();
    $('#btnAddChar').addEventListener('click', () => addCharacter());
    $('#btnGenerate').addEventListener('click', generate);
    $('#btnReset').addEventListener('click', resetForm);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
