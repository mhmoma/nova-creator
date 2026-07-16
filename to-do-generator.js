// 自动调整 textarea 高度的函数
function autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
}

// 为所有 textarea 添加自动调整高度功能
function initTextareaAutoResize() {
    const textareas = document.querySelectorAll('textarea');
    textareas.forEach(textarea => {
        // 初始化高度
        autoResizeTextarea(textarea);

        // 监听输入事件
        textarea.addEventListener('input', () => {
            autoResizeTextarea(textarea);
        });

        // 监听粘贴事件
        textarea.addEventListener('paste', () => {
            setTimeout(() => autoResizeTextarea(textarea), 0);
        });
    });
}

$(document).ready(function() {
    const $navButtons = $('.nav-link');
    const $sections = $('[data-nav-section]');

    if (!$navButtons.length || !$sections.length) {
        return;
    }

    const updateActive = (activeId) => {
        $navButtons.each(function() {
            $(this).toggleClass('active', $(this).data('target') === activeId);
        });
    };

    $navButtons.on('click', function() {
        const targetId = $(this).data('target');
        const $target = $('#' + targetId);
        if ($target.length) {
            $target[0].scrollIntoView({ behavior: 'smooth', block: 'start' });
            updateActive(targetId);
        }
    });

    $('.collapsible').each(function() {
        $(this).attr({
            'aria-expanded': 'true',
            'role': 'button',
            'tabindex': '0'
        });
        const $content = $(this).next();
        if ($content.length) {
            $content.attr('aria-hidden', 'false');
        }
    }).on('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleCollapse(this);
        }
    });

    updateActive($sections.first().attr('id'));

    // 初始化所有现有 textarea 的自动调整高度功能
    initTextareaAutoResize();

    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            const visible = entries
                .filter(entry => entry.isIntersecting)
                .sort((a, b) => {
                    if (b.intersectionRatio !== a.intersectionRatio) {
                        return b.intersectionRatio - a.intersectionRatio;
                    }
                    return a.boundingClientRect.top - b.boundingClientRect.top;
                });

            if (visible.length) {
                updateActive(visible[0].target.id);
            }
        }, {
            root: null,
            threshold: 0.35,
            rootMargin: '-20% 0px -45% 0px'
        });

        $sections.each(function() {
            observer.observe(this);
        });
    } else {
        const handleScroll = () => {
            const scrollTop = $(window).scrollTop();
            let currentId = $sections.first().attr('id');
            $sections.each(function() {
                if ($(this).offset().top - 180 <= scrollTop) {
                    currentId = $(this).attr('id');
                }
            });
            updateActive(currentId);
        };

        $(window).on('scroll', handleScroll);
        handleScroll();
    }
});

let characterCount = 0;
let variableCount = 0;
let coverObjectUrl = null;
let coverFile = null;

function getDefaultCoverPath(workName) {
    return '封面图/' + workName + '.png';
}

function updateDefaultCoverPath() {
    const workName = $('#workName').val().trim();
    const $coverPath = $('#coverPath');
    if (!workName || $coverPath.data('manual')) {
        return;
    }
    $coverPath.val(getDefaultCoverPath(workName));
}

function handleCoverFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) {
        return;
    }

    clearCoverPreview();
    coverFile = file;

    const workName = $('#workName').val().trim() || '作品名称';
    const ext = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')) : '.png';
    $('#coverPath').val('封面图/' + workName + ext).data('manual', false);

    coverObjectUrl = URL.createObjectURL(file);
    $('#coverPreview').attr('src', coverObjectUrl);
    $('#coverPreviewWrap').prop('hidden', false);
}

function clearCoverPreview() {
    if (coverObjectUrl) {
        URL.revokeObjectURL(coverObjectUrl);
        coverObjectUrl = null;
    }
    coverFile = null;
    $('#coverPreview').attr('src', '');
    $('#coverPreviewWrap').prop('hidden', true);
    $('#coverFile').val('');
}

function clearCover() {
    clearCoverPreview();
    $('#coverPath').val('').removeData('manual');
}

function downloadCoverFile(coverPath) {
    if (!coverFile || !coverPath) {
        return;
    }

    const fileName = coverPath.split('/').pop() || coverFile.name;
    const url = URL.createObjectURL(coverFile);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// 初始化时添加一个角色卡和一个变量
$(function() {
    addCharacter();
    addVariable();

    $('#workName').on('input', updateDefaultCoverPath);
    $('#coverPath').on('input', function() {
        $(this).data('manual', Boolean($(this).val().trim()));
    });
    $('#coverFile').on('change', handleCoverFileChange);
});

// 添加角色卡片
function addCharacter() {
    characterCount++;
    const cardHtml = `
    <div class="character-card" id="character-${characterCount}">
        <h3>角色 ${characterCount}</h3>

        <!-- 角色定位 -->
        <div class="form-group">
            <label>📍 角色定位</label>
            <div class="checkbox-group">
                <div class="checkbox-item">
                    <input type="radio" id="char-${characterCount}-role-main" name="char-role-${characterCount}" class="char-role-main" value="主角（NPC）">
                    <label for="char-${characterCount}-role-main">主角（NPC）</label>
                </div>
                <div class="checkbox-item">
                    <input type="radio" id="char-${characterCount}-role-important" name="char-role-${characterCount}" class="char-role-important" value="重要配角">
                    <label for="char-${characterCount}-role-important">重要配角</label>
                </div>
                <div class="checkbox-item">
                    <input type="radio" id="char-${characterCount}-role-normal" name="char-role-${characterCount}" class="char-role-normal" value="普通 NPC">
                    <label for="char-${characterCount}-role-normal">普通 NPC</label>
                </div>
            </div>
        </div>

        <!-- 模板选择 -->
        <div class="form-group">
            <label>📋 使用模板</label>
            <div class="checkbox-group">
                <div class="checkbox-item">
                    <input type="radio" id="char-${characterCount}-template-full" name="char-template-${characterCount}" class="char-template-full" value="原版模板" checked>
                    <label for="char-${characterCount}-template-full">原版模板（完整版）</label>
                </div>
                <div class="checkbox-item">
                    <input type="radio" id="char-${characterCount}-template-simple" name="char-template-${characterCount}" class="char-template-simple" value="简要版模板">
                    <label for="char-${characterCount}-template-simple">简要版模板（精简版）</label>
                </div>
            </div>
        </div>

        <!-- 模式切换 -->
        <div class="mode-toggle-container">
            <span style="font-size: 0.9em; color: var(--text-light);">填写模式：</span>
            <button type="button" class="mode-toggle-btn active" onclick="toggleCharacterMode(${characterCount}, 'simple')">📝 简略模式</button>
            <button type="button" class="mode-toggle-btn" onclick="toggleCharacterMode(${characterCount}, 'detailed')">📋 详细模式</button>
        </div>

        <!-- 简略模式 -->
        <div class="simple-mode active" id="character-${characterCount}-simple">
            <div class="form-group">
                <label>角色名称</label>
                <input type="text" class="char-name" placeholder="填写角色名称">
            </div>
            <div class="form-group">
                <label>人物设定大纲</label>
                <textarea class="char-outline" placeholder="简要描述角色的核心信息，例如：&#10;- 姓名：艾莉克斯&#10;- 性别/年龄：女/28岁&#10;- 职业：工程师&#10;- 核心性格：聪明、谨慎&#10;- 外貌：黑色长发，深褐色眼睛，中等身材&#10;- 背景：避难所高级工程师，父亲是传奇工程师&#10;- 目标：揭开'伊甸园计划'的真相" style="min-height: 160px;"></textarea>
            </div>
        </div>

        <!-- 详细模式 -->
        <div class="detailed-mode" id="character-${characterCount}-detailed">
            <!-- 基本信息 -->
            <div class="form-group">
                <label>🏷️ 基本信息</label>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    <input type="text" class="char-name" placeholder="角色名称">
                    <input type="text" class="char-gender" placeholder="性别（例如：女/男/其他）">
                    <input type="text" class="char-age" placeholder="年龄（例如：28岁）">
                    <input type="text" class="char-race" placeholder="种族（例如：人类/精灵/机械人）">
                </div>
            </div>

            <!-- 外貌特征 -->
            <div class="form-group">
                <label>👤 外貌特征</label>
                <div style="display: grid; gap: 8px;">
                    <input type="text" class="char-height" placeholder="身高/体型（例如：168cm，中等身材）">
                    <input type="text" class="char-hair" placeholder="发型/发色（例如：黑色长发，通常扎马尾）">
                    <input type="text" class="char-eyes" placeholder="眼睛（例如：深褐色眼睛，眼神锐利）">
                    <textarea class="char-appearance" placeholder="其他外貌特征（例如：&#10;- 肤色白皙，有几处浅疤&#10;- 左手有机械义肢&#10;- 总是戴着护目镜）" style="min-height: 160px;"></textarea>
                </div>
            </div>

            <!-- 服饰风格 -->
            <div class="form-group">
                <label>👔 服饰风格</label>
                <div style="display: grid; gap: 8px;">
                    <input type="text" class="char-outfit-daily" placeholder="日常着装（例如：工装裤、黑色背心、工具腰带）">
                    <input type="text" class="char-outfit-special" placeholder="特殊场合着装（可选）">
                    <textarea class="char-accessories" placeholder="配饰与装备（例如：&#10;- 总是携带一个改装过的多功能工具箱&#10;- 戴着父亲留下的怀表）" style="min-height: 160px;"></textarea>
                </div>
            </div>

            <!-- 性格特质 -->
            <div class="form-group">
                <label>💭 性格特质</label>
                <div style="display: grid; gap: 8px;">
                    <textarea class="char-personality" placeholder="核心性格（例如：&#10;- 冷静、理性、善于分析&#10;- 对待工作一丝不苟&#10;- 不善于表达情感，但内心温暖）" style="min-height: 160px;"></textarea>
                    <input type="text" class="char-speech" placeholder="说话方式（例如：语速较快，喜欢用技术术语）">
                    <input type="text" class="char-catchphrase" placeholder="口头禅/习惯用语（例如：'让我算算...'）">
                    <textarea class="char-habits" placeholder="行为习惯（例如：&#10;- 思考时会摆弄手中的工具&#10;- 遇到问题喜欢独自钻研&#10;- 对机械设备有强迫症般的整理欲）" style="min-height: 160px;"></textarea>
                </div>
            </div>

            <!-- 背景故事 -->
            <div class="form-group">
                <label>📖 背景故事</label>
                <div style="display: grid; gap: 8px;">
                    <input type="text" class="char-occupation" placeholder="职业/身份（例如：避难所高级工程师）">
                    <textarea class="char-backstory" placeholder="过去经历（例如：&#10;- 出生在避难所，父亲是传奇工程师&#10;- 12岁时父亲在事故中去世&#10;- 继承父亲遗志，成为最年轻的高级工程师&#10;- 一直在寻找父亲生前研究的'伊甸园计划'真相）" style="min-height: 160px;"></textarea>
                </div>
            </div>

            <!-- 人际关系 -->
            <div class="form-group">
                <label>👥 人际关系</label>
                <textarea class="char-relationships" placeholder="与其他角色的关系（例如：&#10;- 与避难所理事会关系微妙，被重用但不被完全信任&#10;- 有一个青梅竹马的好友，现在是军事派成员&#10;- 对{{user}}：初次见面持警惕态度，但逐渐建立信任）" style="min-height: 160px;"></textarea>
            </div>

            <!-- 动机与目标 -->
            <div class="form-group">
                <label>🎯 动机与目标</label>
                <div style="display: grid; gap: 8px;">
                    <textarea class="char-goals" placeholder="目标与愿望（例如：&#10;- 揭开父亲'伊甸园计划'的真相&#10;- 让避难所的供电系统更加稳定&#10;- 证明自己不是靠父亲的名声）" style="min-height: 160px;"></textarea>
                    <textarea class="char-fears" placeholder="恐惧与弱点（例如：&#10;- 害怕辜负父亲的期望&#10;- 对失去控制的局面感到不安&#10;- 不擅长处理人际关系，容易被孤立）" style="min-height: 160px;"></textarea>
                </div>
            </div>

            <!-- 技能与能力 -->
            <div class="form-group">
                <label>⚡ 技能与能力</label>
                <textarea class="char-skills" placeholder="擅长的技能（例如：&#10;- 精通机械维修和改造&#10;- 优秀的电路设计能力&#10;- 能够快速分析和解决技术问题&#10;- 基础战斗技能（主要是防身）&#10;- 对旧时代科技有深入研究）" style="min-height: 160px;"></textarea>
            </div>

            <!-- 补充说明 -->
            <div class="form-group">
                <label>📝 补充说明</label>
                <textarea class="char-notes" placeholder="其他补充信息、创作灵感、注意事项等" style="min-height: 160px;"></textarea>
            </div>
        </div>

        ${characterCount > 1 ? '<button class="remove-character-btn" onclick="removeCharacter(' + characterCount + ')">删除此角色</button>' : ''}
    </div>
    `;
    $('#charactersContainer').append(cardHtml);

    // 为新添加的 textarea 初始化自动调整高度功能
    setTimeout(() => {
        $('#character-' + characterCount + ' textarea').each(function() {
            autoResizeTextarea(this);
            this.addEventListener('input', () => autoResizeTextarea(this));
            this.addEventListener('paste', () => {
                setTimeout(() => autoResizeTextarea(this), 0);
            });
        });
    }, 0);
}

// 删除角色卡片
function removeCharacter(id) {
    $('#character-' + id).remove();
}

// 添加变量卡片
function addVariable() {
    variableCount++;
    const cardHtml = `
    <div class="variable-card" id="variable-${variableCount}">
        <div class="form-group variable-name-group">
            <label>变量名</label>
            <input type="text" class="var-name" placeholder="例如：好感度">
        </div>
        <div class="form-group">
            <label>说明/要求</label>
            <textarea class="var-desc" placeholder="例如：数值范围 0-100，影响角色对话风格"></textarea>
        </div>
        ${variableCount > 1 ? '<div class="remove-btn-container"><button class="remove-character-btn" onclick="removeVariable(' + variableCount + ')">删除</button></div>' : ''}
    </div>
    `;
    $('#mvuVariablesContainer').append(cardHtml);

    // 为新添加的 textarea 初始化自动调整高度功能
    setTimeout(() => {
        $('#variable-' + variableCount + ' textarea').each(function() {
            autoResizeTextarea(this);
            this.addEventListener('input', () => autoResizeTextarea(this));
            this.addEventListener('paste', () => {
                setTimeout(() => autoResizeTextarea(this), 0);
            });
        });
    }, 0);
}

// 删除变量卡片
function removeVariable(id) {
    $('#variable-' + id).remove();
}

// 清空所有变量
function clearAllVariables() {
    if (confirm('确定要清空所有变量吗？此操作不可撤销。')) {
        $('#mvuVariablesContainer').empty();
        variableCount = 0;
        // 添加一个空白变量
        addVariable();
    }
}

// 加载预设变量
function loadPresetVariables() {
    if (confirm('确定要加载预设变量吗？这将清空当前所有变量。')) {
        // 清空现有变量
        $('#mvuVariablesContainer').empty();
        variableCount = 0;

        // 预设变量列表（通用版本）
        const presetVariables = [
            {
                name: '世界.当前时间',
                desc: '格式为 yyyy年mm月dd日 星期X 上午/下午 hh:mm（24小时制），每次对话或场景转换后根据实际经历的时间自然推进'
            },
            {
                name: '世界.当前地点',
                desc: '具体的房间或场所名称，当角色明确移动到新地点时立即更新'
            },
            {
                name: '角色名.好感度',
                desc: '数值范围 0-100，初始值为0，每次对话后根据角色对{{user}}行为的感受更新，单次变化±1~5（多角色时为每个角色创建独立的好感度变量，如"艾莉克斯.好感度"）'
            },
            {
                name: '角色名.当前着装',
                desc: '详细描述角色当前的穿着，在起床后、洗澡后、外出前等场景需要更新（多角色时为每个角色创建独立的着装变量，如"艾莉克斯.当前着装"）'
            },
            {
                name: '角色名.当前姿势',
                desc: '描述角色此刻的身体姿态和动作，每次对话或场景变化时更新，反映当前状态和情绪（多角色时为每个角色创建独立的姿势变量，如"艾莉克斯.当前姿势"）'
            },
            {
                name: '角色名.当前想法',
                desc: '描述角色当前内心的真实想法，可能与外在表现不一致，每次对话后更新，展现内心活动（多角色时为每个角色创建独立的想法变量，如"艾莉克斯.当前想法"）'
            },
            {
                name: '角色名.关系状态',
                desc: '描述角色与{{user}}的关系阶段，如"陌生人"、"初识"、"朋友"、"亲密"等，随着好感度变化而更新（多角色时为每个角色创建独立的关系状态变量，如"艾莉克斯.关系状态"）'
            }
        ];

        // 添加预设变量
        presetVariables.forEach(preset => {
            variableCount++;
            const cardHtml = `
            <div class="variable-card" id="variable-${variableCount}">
                <div class="form-group variable-name-group">
                    <label>变量名</label>
                    <input type="text" class="var-name" placeholder="例如：好感度" value="${preset.name}">
                </div>
                <div class="form-group">
                    <label>说明/要求</label>
                    <textarea class="var-desc" placeholder="例如：数值范围 0-100，影响角色对话风格">${preset.desc}</textarea>
                </div>
                <div class="remove-btn-container"><button class="remove-character-btn" onclick="removeVariable(${variableCount})">删除</button></div>
            </div>
            `;
            $('#mvuVariablesContainer').append(cardHtml);
        });

        // 为新添加的所有 textarea 初始化自动调整高度功能
        setTimeout(() => {
            $('#mvuVariablesContainer textarea').each(function() {
                autoResizeTextarea(this);
                this.addEventListener('input', () => autoResizeTextarea(this));
                this.addEventListener('paste', () => {
                    setTimeout(() => autoResizeTextarea(this), 0);
                });
            });
        }, 0);

        alert('✅ 已加载 ' + presetVariables.length + ' 个预设变量！你可以根据需要进行修改或删除。');
    }
}

// 切换折叠
function toggleCollapse(element) {
    const $element = $(element);
    $element.toggleClass('collapsed');
    const $content = $element.next();
    if ($content.length) {
        $content.toggleClass('collapsed');
        const isCollapsed = $content.hasClass('collapsed');
        $element.attr('aria-expanded', !isCollapsed);
        $content.attr('aria-hidden', isCollapsed);
    }
}

// 切换背景设定模式
function toggleBackgroundMode(mode) {
    const $simple = $('#background-simple');
    const $detailed = $('#background-detailed');
    const $buttons = $('#step-1 .mode-toggle-btn');

    if (mode === 'simple') {
        $simple.addClass('active');
        $detailed.removeClass('active');
        $buttons.eq(0).addClass('active');
        $buttons.eq(1).removeClass('active');
    } else {
        $simple.removeClass('active');
        $detailed.addClass('active');
        $buttons.eq(0).removeClass('active');
        $buttons.eq(1).addClass('active');
    }
}

// 切换开场白模式
function toggleOpeningMode(mode) {
    const $simple = $('#opening-simple');
    const $detailed = $('#opening-detailed');
    const $buttons = $('#step-3 .mode-toggle-btn');

    if (mode === 'simple') {
        $simple.addClass('active');
        $detailed.removeClass('active');
        $buttons.eq(0).addClass('active');
        $buttons.eq(1).removeClass('active');
    } else {
        $simple.removeClass('active');
        $detailed.addClass('active');
        $buttons.eq(0).removeClass('active');
        $buttons.eq(1).addClass('active');
    }
}

// 切换角色模式
function toggleCharacterMode(charId, mode) {
    const $simple = $('#character-' + charId + '-simple');
    const $detailed = $('#character-' + charId + '-detailed');
    const $buttons = $('#character-' + charId + ' .mode-toggle-btn');

    if (mode === 'simple') {
        $simple.addClass('active');
        $detailed.removeClass('active');
        $buttons.eq(0).addClass('active');
        $buttons.eq(1).removeClass('active');
    } else {
        $simple.removeClass('active');
        $detailed.addClass('active');
        $buttons.eq(0).removeClass('active');
        $buttons.eq(1).addClass('active');
    }
}

// 单选checkbox处理
$(document).on('change', 'input[type="checkbox"][name]', function() {
    if ($(this).prop('checked')) {
        const name = $(this).attr('name');
        $(`input[name="${name}"]`).not(this).prop('checked', false);
    }
});

// 生成 Markdown
function generateMarkdown() {
    const workName = $('#workName').val() || '作品名称';
    const coverPath = $('#coverPath').val().trim() || getDefaultCoverPath(workName);
    let md = '# 角色卡创作任务清单\n\n';
    md += '> ⚠️ **写卡 AI 铁律（必读）**：\n';
    md += '> 1. 本清单正文为**只读需求**，禁止改写、扩写、删减、重排任何设定内容。\n';
    md += '> 2. **仅允许**更新文末进度勾选 `[ ]`/`[x]`。\n';
    md += '> 3. 每步开写前必须打开对应「参考模板」全文，禁止凭记忆写作。\n';
    md += '> 4. 文本状态栏与 `post_history_instructions` 只能用 `基础模板/Z.7.*`，禁止自创宏或自写最高指令。\n';
    md += '> 5. 总规范：`基础模板/写卡AI执行规范.md`\n\n';
    md += '> 📁 **文件组织**：\n';
    md += `> - 请在 \`作品\` 目录下创建名为 \`${workName}\` 的文件夹\n`;
    md += '> - 将此 to-do.md 放入该文件夹\n';
    md += '> - 后续成品（背景、角色、开场白等）均放入同一文件夹\n\n';
    md += '---\n\n';

    // 基本信息
    md += '## 基本信息\n\n';
    md += `**作品名称：** ${$('#workName').val() || '_[待填写]_'}\n\n`;
    md += `**作品类型：** ${$('#workType').val() || '_[待填写]_'}\n\n`;
    md += `**封面图路径：** \`${coverPath}\`\n\n`;
    md += '---\n\n';

    // 第一步：世界观构建
    const needBackground = $('#needBackground').prop('checked');
    if (needBackground) {
        md += '## 创作任务清单\n\n';
        md += '### ✅ 第一步：世界观构建\n\n';

        // 背景设定信息（检查简略和详细模式）
        const bgSimpleMode = $('#background-simple').hasClass('active');
        const bgOutlineSimple = $('#backgroundOutlineSimple').val();

        if (bgSimpleMode && bgOutlineSimple) {
            // 使用简略模式的数据
            md += '**📋 背景设定大纲：**\n\n';
            md += '```\n' + bgOutlineSimple + '\n```\n\n';
        } else {
            // 使用详细模式的数据
            const bgEra = $('#bgEra').val();
            const bgLocation = $('#bgLocation').val();
            const bgDescription = $('#bgDescription').val();
            const bgSpecialRules = $('#bgSpecialRules').val();
            const bgOutline = $('#backgroundOutline').val();

            md += '**📋 背景设定详细信息：**\n\n';
            md += `- **时代/时期：** ${bgEra || '_[待填写]_'}\n`;
            md += `- **主要地点：** ${bgLocation || '_[待填写]_'}\n\n`;

            md += '- **背景描述：**\n';
            if (bgDescription) {
                md += '```\n' + bgDescription + '\n```\n\n';
            } else {
                md += '_[待填写]_\n\n';
            }

            if (bgSpecialRules) {
                md += '- **特殊规则/系统：**\n';
                md += '```\n' + bgSpecialRules + '\n```\n\n';
            }

            if (bgOutline) {
                md += '- **补充说明：**\n';
                md += '```\n' + bgOutline + '\n```\n\n';
            }
        }

        md += '**参考模板：** `基础模板/Z.1.背景模板.md`\n\n';
        md += '---\n\n';
    }

    // 第二步：角色设定
    const needCharacter = $('#needCharacter').prop('checked');
    if (needCharacter) {
        md += '### ✅ 第二步：角色设定\n\n';
        const $characterCards = $('.character-card');
        md += `**主要角色数量：** ${$characterCards.length}\n\n`;

        $characterCards.each(function(index) {
        const $card = $(this);
        md += `#### 角色 ${index + 1}\n\n`;

        // 角色定位
        const roleMain = $card.find('.char-role-main').prop('checked');
        const roleImportant = $card.find('.char-role-important').prop('checked');
        const roleNormal = $card.find('.char-role-normal').prop('checked');

        md += '**📍 角色定位：**\n';
        md += `- [${roleMain ? 'x' : ' '}] 主角（NPC）\n`;
        md += `- [${roleImportant ? 'x' : ' '}] 重要配角\n`;
        md += `- [${roleNormal ? 'x' : ' '}] 普通 NPC\n\n`;

        // 模板选择
        const useSimpleTemplate = $card.find('.char-template-simple').prop('checked');
        const useFullTemplate = $card.find('.char-template-full').prop('checked');
        md += '**📋 使用模板：**\n';
        md += `- [${useFullTemplate ? 'x' : ' '}] 原版模板（完整版）\n`;
        md += `- [${useSimpleTemplate ? 'x' : ' '}] 简要版模板（精简版）\n\n`;

        // 检查是否使用简略模式
        const charId = $card.attr('id').replace('character-', '');
        const $simpleDiv = $card.find('#character-' + charId + '-simple');
        const simpleMode = $simpleDiv.hasClass('active');
        const outline = $simpleDiv.find('.char-outline').val();

        if (simpleMode && outline) {
            // 使用简略模式的数据
            const name = $simpleDiv.find('.char-name').val();
            md += `**角色名称：** ${name || '_[待填写]_'}\n\n`;
            md += '**人物设定大纲：**\n\n';
            md += '```\n' + outline + '\n```\n\n';
            // 根据选择的模板类型显示对应的参考模板
            if (useSimpleTemplate) {
                md += '**参考模板：** `基础模板/Z.2.人物模板-简要版.md`\n\n';
            } else {
                md += '**参考模板：** `基础模板/Z.2.人物模板.md`\n\n';
            }
        } else {
            // 使用详细模式的数据
            const $detailedDiv = $card.find('#character-' + charId + '-detailed');

            // 基本信息
            const name = $detailedDiv.find('.char-name').val();
            const gender = $detailedDiv.find('.char-gender').val();
            const age = $detailedDiv.find('.char-age').val();
            const race = $detailedDiv.find('.char-race').val();

            md += '**🏷️ 基本信息：**\n\n';
            md += `- **姓名：** ${name || '_[待填写]_'}\n`;
            md += `- **性别：** ${gender || '_[待填写]_'}\n`;
            md += `- **年龄：** ${age || '_[待填写]_'}\n`;
            md += `- **种族：** ${race || '_[待填写]_'}\n\n`;

            // 外貌特征
            const height = $detailedDiv.find('.char-height').val();
            const hair = $detailedDiv.find('.char-hair').val();
            const eyes = $detailedDiv.find('.char-eyes').val();
            const appearance = $detailedDiv.find('.char-appearance').val();

            md += '**👤 外貌特征：**\n\n';
            md += `- **身高/体型：** ${height || '_[待填写]_'}\n`;
            md += `- **发型/发色：** ${hair || '_[待填写]_'}\n`;
            md += `- **眼睛：** ${eyes || '_[待填写]_'}\n`;
            if (appearance) {
                md += '- **其他特征：**\n```\n' + appearance + '\n```\n\n';
            } else {
                md += '- **其他特征：** _[待填写]_\n\n';
            }

            // 服饰风格
            const outfitDaily = $detailedDiv.find('.char-outfit-daily').val();
            const outfitSpecial = $detailedDiv.find('.char-outfit-special').val();
            const accessories = $detailedDiv.find('.char-accessories').val();

            md += '**👔 服饰风格：**\n\n';
            md += `- **日常着装：** ${outfitDaily || '_[待填写]_'}\n`;
            if (outfitSpecial) {
                md += `- **特殊场合：** ${outfitSpecial}\n`;
            }
            if (accessories) {
                md += '- **配饰与装备：**\n```\n' + accessories + '\n```\n\n';
            } else {
                md += '- **配饰与装备：** _[待填写]_\n\n';
            }

            // 性格特质
            const personality = $detailedDiv.find('.char-personality').val();
            const speech = $detailedDiv.find('.char-speech').val();
            const catchphrase = $detailedDiv.find('.char-catchphrase').val();
            const habits = $detailedDiv.find('.char-habits').val();

            md += '**💭 性格特质：**\n\n';
            if (personality) {
                md += '- **核心性格：**\n```\n' + personality + '\n```\n';
            } else {
                md += '- **核心性格：** _[待填写]_\n';
            }
            md += `- **说话方式：** ${speech || '_[待填写]_'}\n`;
            md += `- **口头禅：** ${catchphrase || '_[待填写]_'}\n`;
            if (habits) {
                md += '- **行为习惯：**\n```\n' + habits + '\n```\n\n';
            } else {
                md += '- **行为习惯：** _[待填写]_\n\n';
            }

            // 背景故事
            const occupation = $detailedDiv.find('.char-occupation').val();
            const backstory = $detailedDiv.find('.char-backstory').val();

            md += '**📖 背景故事：**\n\n';
            md += `- **职业/身份：** ${occupation || '_[待填写]_'}\n`;
            if (backstory) {
                md += '- **过去经历：**\n```\n' + backstory + '\n```\n\n';
            } else {
                md += '- **过去经历：** _[待填写]_\n\n';
            }

            // 人际关系
            const relationships = $detailedDiv.find('.char-relationships').val();

            md += '**👥 人际关系：**\n\n';
            if (relationships) {
                md += '```\n' + relationships + '\n```\n\n';
            } else {
                md += '_[待填写]_\n\n';
            }

            // 动机与目标
            const goals = $detailedDiv.find('.char-goals').val();
            const fears = $detailedDiv.find('.char-fears').val();

            md += '**🎯 动机与目标：**\n\n';
            if (goals) {
                md += '- **目标与愿望：**\n```\n' + goals + '\n```\n';
            } else {
                md += '- **目标与愿望：** _[待填写]_\n';
            }
            if (fears) {
                md += '- **恐惧与弱点：**\n```\n' + fears + '\n```\n\n';
            } else {
                md += '- **恐惧与弱点：** _[待填写]_\n\n';
            }

            // 技能与能力
            const skills = $detailedDiv.find('.char-skills').val();

            md += '**⚡ 技能与能力：**\n\n';
            if (skills) {
                md += '```\n' + skills + '\n```\n\n';
            } else {
                md += '_[待填写]_\n\n';
            }

            // 补充说明
            const notes = $detailedDiv.find('.char-notes').val();

            if (notes) {
                md += '**📝 补充说明：**\n\n';
                md += '```\n' + notes + '\n```\n\n';
            }

            // 根据选择的模板类型显示对应的参考模板
            if (useSimpleTemplate) {
                md += '**参考模板：** `基础模板/Z.2.人物模板-简要版.md`\n\n';
            } else {
                md += '**参考模板：** `基础模板/Z.2.人物模板.md`\n\n';
            }
        }
    });
    }

    // 第三步：开场白
    const needOpening = $('#needOpening').prop('checked');
    if (needOpening) {
        md += '### ✅ 第三步：开场白\n\n';
        md += `**开场场景：** ${$('#openingScene').val() || '_[待填写]_'}\n\n`;

        md += '**目标篇幅：**\n';
        md += `- [${$('#length1').prop('checked') ? 'x' : ' '}] 简单场景（300-500字）\n`;
        md += `- [${$('#length2').prop('checked') ? 'x' : ' '}] 标准场景（500-800字）\n`;
        md += `- [${$('#length3').prop('checked') ? 'x' : ' '}] 复杂场景（800-1500字）\n\n`;

    // 开场白信息（检查简略和详细模式）
    const openingSimpleMode = $('#opening-simple').hasClass('active');
    const openingOutlineSimple = $('#openingOutlineSimple').val();

    if (openingSimpleMode && openingOutlineSimple) {
        // 使用简略模式的数据
        md += '**📋 开场白大纲：**\n\n';
        md += '```\n' + openingOutlineSimple + '\n```\n\n';
    } else {
        // 使用详细模式的数据
        const openingSpecificScene = $('#openingSpecificScene').val();
        const openingTime = $('#openingTime').val();
        const openingLocation = $('#openingLocation').val();
        const openingAtmosphere = $('#openingAtmosphere').val();
        const openingUserRelation = $('#openingUserRelation').val();
        const openingInitialConflict = $('#openingInitialConflict').val();
        const openingOutline = $('#openingOutline').val();

        md += '**📋 开场白详细信息：**\n\n';
        md += `- **具体场景：** ${openingSpecificScene || '_[待填写]_'}\n`;
        md += `- **时间：** ${openingTime || '_[待填写]_'}\n`;
        md += `- **地点：** ${openingLocation || '_[待填写]_'}\n`;
        md += `- **天气/氛围：** ${openingAtmosphere || '_[待填写]_'}\n`;
        md += `- **与 {{user}} 的关系：** ${openingUserRelation || '_[待填写]_'}\n\n`;

        md += '- **初始情境/冲突：**\n';
        if (openingInitialConflict) {
            md += '```\n' + openingInitialConflict + '\n```\n\n';
        } else {
            md += '_[待填写]_\n\n';
        }

        if (openingOutline) {
            md += '- **补充说明：**\n';
            md += '```\n' + openingOutline + '\n```\n\n';
        }
    }

    md += '**参考模板：** `基础模板/Z.3.开场白.md`\n\n';
    md += '---\n\n';
    }

    // 第四步：对话补充
    const needDialogue = document.getElementById('needDialogue').checked;
    if (needDialogue) {
        md += '### ✅ 第四步：对话补充（可选）\n\n';
        md += `**对应角色：** ${document.getElementById('dialogueCharacter').value || '_[待填写]_'}\n\n`;

        const dialogueScenes = document.getElementById('dialogueScenes').value;
        md += '**场景需求：**\n';
        if (dialogueScenes) {
            md += '```\n' + dialogueScenes + '\n```\n\n';
        } else {
            md += '_[待填写]_\n\n';
        }

        md += '**参考模板：** `基础模板/Z.4.对话补充.md`\n\n';
        md += '---\n\n';
    }

    // 第五步：角色采访
    const needInterview = document.getElementById('needInterview').checked;
    if (needInterview) {
        md += '### ✅ 第五步：角色采访（可选）\n\n';
        md += `**对应角色：** ${document.getElementById('interviewCharacter').value || '_[待填写]_'}\n\n`;

        const interviewTopics = document.getElementById('interviewTopics').value;
        md += '**采访主题：**\n';
        if (interviewTopics) {
            md += '```\n' + interviewTopics + '\n```\n\n';
        } else {
            md += '_[待填写]_\n\n';
        }

        md += '**参考模板：** `基础模板/Z.5.角色采访.md`\n\n';
        md += '---\n\n';
    }

    // 第六步：玩家角色设定
    const needPlayer = document.getElementById('needPlayer').checked;
    if (needPlayer) {
        md += '### ✅ 第六步：玩家角色设定（可选）\n\n';
        md += '**设定深度：**\n';
        md += `- [${document.getElementById('depth1').checked ? 'x' : ' '}] 极简设定（最大自由度）\n`;
        md += `- [${document.getElementById('depth2').checked ? 'x' : ' '}] 简化设定（有基本框架）\n`;
        md += `- [${document.getElementById('depth3').checked ? 'x' : ' '}] 完整设定（明确背景和性格）\n\n`;

        const playerOutline = document.getElementById('playerOutline').value;
        md += '**玩家角色大纲：**\n';
        if (playerOutline) {
            md += '```\n' + playerOutline + '\n```\n\n';
        } else {
            md += '_[待填写]_\n\n';
        }

        md += '**参考模板：** `基础模板/Z.6.玩家模板.md`\n\n';
        md += '---\n\n';
    }

    // 第七步：MVU 组件包
    const needMVU = document.getElementById('needMVU').checked;
    if (needMVU) {
        md += '### ✅ 第七步：MVU 组件包（可选）\n\n';
        md += '**组件选择：**\n';
        md += `- [${document.getElementById('mvuCore').checked ? 'x' : ' '}] MVU核心组件（1.0-3.2）\n`;
        md += '  - 包含：变量结构设计、变量初始化、变量更新规则、变量列表、变量输出格式\n';
        md += `- [${document.getElementById('mvu5').checked ? 'x' : ' '}] 分阶段角色设定\n`;
        md += `- [${document.getElementById('mvu6').checked ? 'x' : ' '}] 动态世界内容\n`;
        md += `- [${document.getElementById('mvu7').checked ? 'x' : ' '}] HTML状态栏\n\n`;

        // 收集变量信息
        const variableCards = document.querySelectorAll('.variable-card');
        md += '**需要追踪的变量：**\n\n';
        if (variableCards.length > 0) {
            variableCards.forEach((card, index) => {
                const varName = card.querySelector('.var-name').value || '_[待填写]_';
                const varDesc = card.querySelector('.var-desc').value || '_[待填写]_';
                md += `${index + 1}. **${varName}**：${varDesc}\n`;
            });
            md += '\n';
        } else {
            md += '_[待填写]_\n\n';
        }

        // 分阶段角色设定
        const stageSettings = document.getElementById('mvuStageSettings').value;
        md += '**分阶段角色设定说明：**\n';
        if (stageSettings) {
            md += '```\n' + stageSettings + '\n```\n\n';
        } else {
            md += '_[待填写]_\n\n';
        }

        // 动态世界内容
        const dynamicWorld = document.getElementById('mvuDynamicWorld').value;
        md += '**动态世界内容说明：**\n';
        if (dynamicWorld) {
            md += '```\n' + dynamicWorld + '\n```\n\n';
        } else {
            md += '_[待填写]_\n\n';
        }

        // HTML 状态栏
        const htmlDisplay = document.getElementById('mvuHtmlDisplay').value;
        md += '**HTML 状态栏显示需求：**\n';
        if (htmlDisplay) {
            md += '```\n' + htmlDisplay + '\n```\n\n';
        } else {
            md += '_[待填写]_\n\n';
        }

        // 其他特殊说明
        const mvuNotes = document.getElementById('mvuNotes').value;
        md += '**其他特殊说明：**\n';
        if (mvuNotes) {
            md += '```\n' + mvuNotes + '\n```\n\n';
        } else {
            md += '_[待填写]_\n\n';
        }

        md += '**参考模板：** `MVU组件包/` 目录下的相关文件\n\n';
        md += '---\n\n';
    }

    // 额外需求
    const extraReq = document.getElementById('extraRequirements').value;
    if (extraReq.trim()) {
        md += '## 额外需求\n\n';
        md += '**特殊要求或补充说明：**\n';
        md += '```\n' + extraReq + '\n```\n\n';
        md += '---\n\n';
    }

    // 创作进度跟踪
    md += '## 创作进度跟踪\n\n';

    // 根据各步骤是否需要动态生成进度跟踪项
    if ($('#needBackground').prop('checked')) {
        md += '- [ ] 背景设定完成\n';
    }
    if ($('#needCharacter').prop('checked')) {
        md += '- [ ] 角色设定完成\n';
    }
    if ($('#needOpening').prop('checked')) {
        md += '- [ ] 开场白完成\n';
    }
    if (document.getElementById('needDialogue').checked) {
        md += '- [ ] 对话补充完成\n';
    }
    if (document.getElementById('needInterview').checked) {
        md += '- [ ] 角色采访完成\n';
    }
    if (document.getElementById('needPlayer').checked) {
        md += '- [ ] 玩家角色完成\n';
    }
    if (document.getElementById('needMVU').checked) {
        md += '- [ ] MVU 组件包配置完成\n';
    }
    md += '- [ ] 编写打包配置文件\n';
    if (coverFile) {
        md += '- [x] 准备封面图（`'+ coverPath + '`，已上传）\n';
    } else {
        md += '- [ ] 准备封面图（`' + coverPath + '`）\n';
    }
    md += '- [ ] 运行打包程序生成 JSON 角色卡\n';
    md += '- [ ] 运行打包程序生成 PNG 角色卡\n\n';
    md += '---\n\n';

    // 打包说明
    md += '## 📦 角色卡打包说明\n\n';
    md += '完成所有创作内容后，需要使用打包程序将文件整合成 SillyTavern 可导入的角色卡。支持 JSON 和 PNG 两种格式。\n\n';

    md += '### 第一步：编写配置文件\n\n';
    md += '在项目根目录创建一个 YAML 配置文件（例如：`' + workName + '.yaml`），内容参考以下格式：\n\n';
    md += '```yaml\n';
    md += '# 基础信息\n';
    md += 'name: ' + workName + '\n';
    md += 'creator: ""\n';
    md += 'character_version: ""\n\n';
    md += '# 封面图路径（PNG 打包时直接读取）\n';
    md += 'cover: ' + coverPath + '\n\n';
    md += '# 主要字段映射\n';
    md += '# description→作品简介；system_prompt→系统指令（平台栏）；详设在世界书。见 Z.8\n';
    md += '# 对话补充等额外设定应该放入 character_book，而不是使用 mes_example\n';
    md += 'fields:\n';
    md += '  description: 作品/' + workName + '/作品简介.md\n';
    md += '  personality: ""\n';
    md += '  scenario: 作品/' + workName + '/场景设定.md\n';
    md += '  first_mes: 作品/' + workName + '/开场白.md\n';
    md += '  mes_example: ""\n';
    md += '  creator_notes: ""\n';
    md += '  system_prompt: 作品/' + workName + '/系统指令.md\n';
    md += '  post_history_instructions: 作品/' + workName + '/状态栏最高指令.md\n\n';
    md += '# 扩展字段\n';
    md += 'extensions:\n';
    md += '  talkativeness: "0.5"\n';
    md += '  fav: false\n';
    md += '  world: ' + workName + '\n';
    md += '  # 文本状态栏勿填此项；仅 MVU HTML 路线才启用\n';
    md += '  # status_bar: 作品/' + workName + '/状态栏.html\n\n';
    if (document.getElementById('needMVU').checked) {
        md += '# 脚本配置\n';
        md += 'scripts:\n';
        md += '  # 变量结构设计脚本（Zod Schema）\n';
        md += '  - name: "变量结构设计"\n';
        md += '    content: 作品/' + workName + '/变量结构.js\n';
        md += '    enabled: true\n\n';
    }
    md += '# 角色书配置\n';
    md += 'character_book:\n';
    md += '  name: ' + workName + '\n';
    md += '  entries:\n';
    if (document.getElementById('needMVU').checked) {
        md += '    # [InitVar]初始化条目\n';
        md += '    - comment: "[initvar]变量初始化"\n';
        md += '      content: 作品/' + workName + '/[initvar]变量初始化.xyaml\n';
        md += '      enabled: false\n';
        md += '      position: before_char\n';
        md += '      insertion_order: 101\n';
        md += '      depth: 4\n';
        md += '      role: 0\n\n';
        md += '    # 变量更新规则\n';
        md += '    - comment: "[mvu_update]变量更新规则"\n';
        md += '      content: 作品/' + workName + '/[mvu_update]变量更新规则.xyaml\n';
        md += '      enabled: true\n';
        md += '      position: at_depth\n';
        md += '      insertion_order: 1\n';
        md += '      depth: 1\n';
        md += '      role: 0\n\n';
        md += '    # 变量列表\n';
        md += '    - comment: "变量列表"\n';
        md += '      content: 作品/' + workName + '/变量列表.xyaml\n';
        md += '      enabled: true\n';
        md += '      position: at_depth\n';
        md += '      insertion_order: 2\n';
        md += '      depth: 1\n';
        md += '      role: 0\n\n';
        md += '    # 变量输出格式\n';
        md += '    - comment: "[mvu_update]变量输出格式"\n';
        md += '      content: 作品/' + workName + '/[mvu_update]变量输出格式.xyaml\n';
        md += '      enabled: true\n';
        md += '      position: at_depth\n';
        md += '      insertion_order: 3\n';
        md += '      depth: 1\n';
        md += '      role: 0\n\n';
    }
    // 根据各步骤是否需要动态生成配置文件条目
    let insertionOrder = 1;

    if ($('#needBackground').prop('checked')) {
        md += '    # 背景设定\n';
        md += '    - comment: "背景设定"\n';
        md += '      content: 作品/' + workName + '/背景设定.xyaml\n';
        md += '      enabled: true\n';
        md += '      position: before_char\n';
        md += '      insertion_order: ' + insertionOrder + '\n';
        md += '      depth: 4\n';
        md += '      role: 0\n\n';
        insertionOrder++;
    }

    if (document.getElementById('needPlayer').checked) {
        md += '    # 玩家角色\n';
        md += '    - comment: "玩家角色_{{user}}"\n';
        md += '      content: 作品/' + workName + '/玩家角色_{{user}}.xyaml\n';
        md += '      enabled: true\n';
        md += '      position: before_char\n';
        md += '      insertion_order: ' + insertionOrder + '\n';
        md += '      depth: 4\n';
        md += '      role: 0\n\n';
        insertionOrder++;
    }

    md += '    # 文本状态栏（标准模板：基础模板/Z.7.状态栏.xyaml）\n';
    md += '    - comment: "角色深度扫描"\n';
    md += '      content: 作品/' + workName + '/状态栏.xyaml\n';
    md += '      enabled: true\n';
    md += '      position: after_char\n';
    md += '      insertion_order: 0\n';
    md += '      depth: 4\n';
    md += '      role: 0\n\n';
    md += '    # 其他设定条目（可添加多个）\n';
    md += '    - comment: "其他设定条目1"\n';
    md += '      content: 作品/' + workName + '/其他设定1.xyaml\n';
    md += '      enabled: true\n';
    md += '      position: after_char\n';
    md += '      insertion_order: 1\n';
    md += '      depth: 4\n';
    md += '      role: 0\n';
    md += '```\n\n';

    md += '**配置说明：**\n\n';
    md += '- `name`: 角色卡名称\n';
    md += '- `fields`: 各个字段对应的文件路径，空字符串 `""` 表示该字段为空\n';
    md += '- `description`: 多角色用 `作品简介.md`（`Z.8.作品概述.md`）；单角色可改为人设文件\n';
    md += '- `system_prompt`: 平台「系统指令」← `系统指令.md`（`Z.8.系统指令.md`）\n';
    md += '- `post_history_instructions`: ← `状态栏最高指令.md`（`Z.7`）。禁止「一字不差输出世界书」\n';
    md += '- `extensions.status_bar`: 仅 MVU HTML；文本状态栏勿填\n';
    md += '- 文本状态栏：复制 `Z.7.状态栏.xyaml`，comment 固定「角色深度扫描」\n';
    md += '- `character_book.entries`: 角色书条目列表\n';
    md += '  - `comment`: 条目名称\n';
    md += '  - `content`: 条目内容对应的文件路径\n';
    md += '  - `position`: 插入位置（`before_char`/`after_char`/`at_depth`）\n';
    md += '  - `insertion_order`: 插入顺序（数字越小越靠前）\n';
    md += '  - `depth`: 深度值（1-4）\n';
    md += '  - `role`: 角色类型（0=系统，1=用户，2=AI）\n\n';

    md += '**参考示例：** `config.example.yaml`\n\n';

    md += '### 第二步：生成 JSON 角色卡\n\n';
    md += '确保已安装 Node.js 和依赖包，然后在项目根目录运行：\n\n';
    md += '```bash\n';
    md += '# 首次使用需要安装依赖\n';
    md += 'npm install\n\n';
    md += '# 生成 JSON 角色卡\n';
    md += 'node build-card.js ' + workName + '.yaml\n';
    md += '```\n\n';

    md += '程序会自动读取配置文件，整合所有内容，生成 `完整作品/' + workName + '/' + workName + '.json` 文件。\n\n';

    md += '### 第三步：准备封面图\n\n';
    md += '封面图路径已在配置文件中指定：\n\n';
    md += '```\n';
    md += 'cover: ' + coverPath + '\n';
    md += '```\n\n';
    if (coverFile) {
        md += '生成清单时已同时下载封面图，请将其保存到项目中的上述路径。\n\n';
    } else {
        md += '请将封面图放入项目中的上述路径，或在 YAML 配置里修改 `cover` 字段。\n\n';
    }

    md += '### 第四步：生成 PNG 角色卡\n\n';
    md += '打包程序会读取 YAML 中的 `cover` 路径作为封面图：\n\n';
    md += '```bash\n';
    md += '# 从 YAML 配置文件直接生成 PNG\n';
    md += 'node build-card-png.js ' + workName + '.yaml\n\n';
    md += '# 或从已生成的 JSON 生成 PNG\n';
    md += 'node build-card-png.js 完整作品/' + workName + '/' + workName + '.json\n';
    md += '```\n\n';

    md += '程序会将角色卡 JSON 嵌入封面图，生成 `完整作品/' + workName + '/' + workName + '.png` 文件。\n\n';

    md += '---\n\n';

    // 版本记录
    const today = new Date().toISOString().split('T')[0];
    md += '## 版本记录\n\n';
    md += `**v1.0** - ${today} - 初始版本创建\n\n`;
    md += '---\n\n';
    md += '> 💾 **提示**：建议使用 Git 进行版本管理，每完成一个重要阶段就提交一次，方便回溯和对比不同版本。\n';

    // 下载文件
    downloadMarkdown(md);
    if (coverFile) {
        downloadCoverFile(coverPath);
    }
}

// 下载 Markdown 文件
function downloadMarkdown(content) {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'to-do.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    const message = coverFile
        ? '✅ Markdown 和封面图已生成！请将封面图保存到配置中的路径。'
        : '✅ Markdown 文件已生成！请查看下载的 to-do.md 文件。';
    alert(message);
}

// 重置表单
function resetForm() {
    if (confirm('确定要重置表单吗？所有填写的内容将被清空。')) {
        location.reload();
    }
}

/**
 * ----------------------------------------------------------------
 * 功能：文本解析与自动填充 (完整版)
 * 作者：HuoHuaAI
 * ----------------------------------------------------------------
 *
 * 使用说明：
 * 1. 将您的角色资料整理成 `基础模板/格式化导入模板.md` 文件中的格式。
 * 2. 将整理好的文本粘贴到“文本导入”框中。
 * 3. 点击“解析并填充”按钮，信息将自动填入表单。
 *
 * 支持的格式：
 * - 使用 `## 标题` 区分大的模块（单独的 `---` 仅作装饰，不参与切分）。
 * - 在每个模块下，使用 `字段名: 值` 的格式来填写信息。
 * - 对于多行文本（如“背景描述”），字段名写在第一行，后续所有行都会被识别。
 * - 列表续行（`- xxx:` / `1. xxx:`）不会被误判为新字段。
 * - 对于需要勾选的选项（如“需要”），直接写 `字段名: 需要` 即可。
 * - 对于多选字段（如“组件选择”），多行内容会被合并。
 * - 同一类模块出现多次（如多段对话补充）会自动合并填充。
 */
function parseAndFill() {
    let text = $('#importText').val();
    if (!text.trim()) {
        alert('导入的文本不能为空！');
        return;
    }

    // 统一换行，避免 Windows CRLF 导致字段正则匹配失败
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // 重置部分表单以避免数据叠加
    $('#charactersContainer').empty();
    characterCount = 0;
    addCharacter(); // 至少保证有一个角色卡
    $('#mvuVariablesContainer').empty();
    variableCount = 0;
    addVariable(); // 至少保证有一个变量卡

    // 仅按 ## 二级标题分节；单独的 --- 只是装饰分隔线，不能参与切分
    // （旧逻辑把 --- 也当分隔符，会导致标题变成「## 基本信息」从而全部匹配失败）
    const sections = text.split(/(?:^|\n)##\s+/);

    sections.forEach(sectionText => {
        if (!sectionText.trim()) return;

        const lines = sectionText.trim().split('\n');
        // 去掉可能残留的 # 前缀，并忽略纯 --- 装饰行
        let title = lines.shift().trim().replace(/^#+\s*/, '');
        const content = lines
            .filter(line => line.trim() !== '---')
            .join('\n');
        if (!title || title.startsWith('文本导入格式')) return;

        const data = parseSectionContent(content);

        if (title.startsWith('基本信息')) {
            fillBasicInfo(data);
        } else if (title.startsWith('世界观构建')) {
            fillWorldBuilding(data);
        } else if (title.startsWith('角色设定')) {
            const match = title.match(/角色设定\s*(\d+)/);
            if (match) {
                const charIndex = parseInt(match[1], 10);
                fillCharacter(charIndex, data);
            }
        } else if (title.startsWith('开场白')) {
            fillOpening(data);
        } else if (title.startsWith('对话补充')) {
            fillDialogue(data);
        } else if (title.startsWith('角色采访')) {
            fillInterview(data);
        } else if (title.startsWith('玩家角色设定')) {
            fillPlayer(data);
        } else if (title.startsWith('MVU 组件包')) {
            fillMvu(data);
        } else if (title.startsWith('额外需求')) {
            fillExtra(data);
        }
    });

    // 重新初始化所有文本域的高度
    initTextareaAutoResize();
    alert('✅ 数据已填充完毕！请检查各个栏位是否正确。');
}

function parseSectionContent(sectionContent) {
    const lines = sectionContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n');
    const data = {};
    let currentKey = null;
    let multiLineValue = '';

    for (const line of lines) {
        // 顶层「字段名: 值」；列表项（- xxx: / 1. xxx:）视为多行内容续行，避免把场景需求等截断
        const match = line.match(/^(?![-*•]\s|\d+\.\s)([^:]+):\s*(.*)$/);
        if (match) {
            // 如果是新的key-value对，先保存上一个多行文本
            if (currentKey) {
                data[currentKey] = multiLineValue.trim();
            }
            currentKey = match[1].trim();
            multiLineValue = match[2].trim();
        } else if (currentKey) {
            // 如果不是key-value，说明是多行文本的延续
            multiLineValue += '\n' + line;
        }
    }
    // 保存最后一个key-value
    if (currentKey) {
        data[currentKey] = multiLineValue.trim();
    }
    return data;
}

function fillBasicInfo(data) {
    if (data['作品名称']) $('#workName').val(data['作品名称']);
    if (data['作品类型']) $('#workType').val(data['作品类型']);
    if (data['封面图路径']) {
        $('#coverPath').val(data['封面图路径']).data('manual', true);
    }
}

function fillWorldBuilding(data) {
    if (data['需要'] === '需要') $('#needBackground').prop('checked', true).trigger('change');
    if (data['模式']?.toLowerCase() === '详细') toggleBackgroundMode('detailed');
    else toggleBackgroundMode('simple');

    if (data['背景设定大纲']) $('#backgroundOutlineSimple').val(data['背景设定大纲']);
    if (data['时代/时期']) $('#bgEra').val(data['时代/时期']);
    if (data['主要地点']) $('#bgLocation').val(data['主要地点']);
    if (data['背景描述']) $('#bgDescription').val(data['背景描述']);
    if (data['特殊规则/系统']) $('#bgSpecialRules').val(data['特殊规则/系统']);
    if (data['补充说明']) $('#backgroundOutline').val(data['补充说明']);
}

function fillCharacter(index, data) {
    while (characterCount < index) {
        addCharacter();
    }
    const $card = $(`#character-${index}`);
    if (!$card.length) return;

    if (data['需要'] === '需要') $('#needCharacter').prop('checked', true).trigger('change');

    if (data['角色定位']) {
        $card.find(`input[name="char-role-${index}"][value*="${data['角色定位']}"]`).prop('checked', true);
    }
    if (data['使用模板']?.includes('简要')) {
        $card.find(`input[name="char-template-${index}"].char-template-simple`).prop('checked', true);
    } else {
        $card.find(`input[name="char-template-${index}"].char-template-full`).prop('checked', true);
    }

    if (data['模式']?.toLowerCase() === '详细') toggleCharacterMode(index, 'detailed');
    else toggleCharacterMode(index, 'simple');

    // 简略和详细
    if (data['角色名称']) $card.find('.char-name').val(data['角色名称']);
    if (data['人物设定大纲']) $card.find('.char-outline').val(data['人物设定大纲']);

    // 详细
    if (data['性别']) $card.find('.char-gender').val(data['性别']);
    if (data['年龄']) $card.find('.char-age').val(data['年龄']);
    if (data['种族']) $card.find('.char-race').val(data['种族']);
    if (data['身高/体型']) $card.find('.char-height').val(data['身高/体型']);
    if (data['发型/发色']) $card.find('.char-hair').val(data['发型/发色']);
    if (data['眼睛']) $card.find('.char-eyes').val(data['眼睛']);
    if (data['其他外貌特征']) $card.find('.char-appearance').val(data['其他外貌特征']);
    if (data['日常着装']) $card.find('.char-outfit-daily').val(data['日常着装']);
    if (data['特殊场合着装']) $card.find('.char-outfit-special').val(data['特殊场合着装']);
    if (data['配饰与装备']) $card.find('.char-accessories').val(data['配饰与装备']);
    if (data['核心性格']) $card.find('.char-personality').val(data['核心性格']);
    if (data['说话方式']) $card.find('.char-speech').val(data['说话方式']);
    if (data['口头禅/习惯用语']) $card.find('.char-catchphrase').val(data['口头禅/习惯用语']);
    if (data['行为习惯']) $card.find('.char-habits').val(data['行为习惯']);
    if (data['职业/身份']) $card.find('.char-occupation').val(data['职业/身份']);
    if (data['过去经历']) $card.find('.char-backstory').val(data['过去经历']);
    if (data['人际关系']) $card.find('.char-relationships').val(data['人际关系']);
    if (data['目标与愿望']) $card.find('.char-goals').val(data['目标与愿望']);
    if (data['恐惧与弱点']) $card.find('.char-fears').val(data['恐惧与弱点']);
    if (data['技能与能力']) $card.find('.char-skills').val(data['技能与能力']);
    if (data['补充说明']) $card.find('.char-notes').val(data['补充说明']);
}

function fillOpening(data) {
    if (data['需要'] === '需要') $('#needOpening').prop('checked', true).trigger('change');
    if (data['模式']?.toLowerCase() === '详细') toggleOpeningMode('detailed');
    else toggleOpeningMode('simple');

    if (data['开场场景']) $('#openingScene').val(data['开场场景']);
    if (data['目标篇幅']) {
        $('input[name="openingLength"]').each(function() {
            if (data['目标篇幅'].includes($(this).val())) {
                $(this).prop('checked', true);
            }
        });
    }

    if (data['开场白大纲']) $('#openingOutlineSimple').val(data['开场白大纲']);
    if (data['具体场景']) $('#openingSpecificScene').val(data['具体场景']);
    if (data['时间']) $('#openingTime').val(data['时间']);
    if (data['地点']) $('#openingLocation').val(data['地点']);
    if (data['天气/氛围']) $('#openingAtmosphere').val(data['天气/氛围']);
    if (data['与 {{user}} 的关系']) $('#openingUserRelation').val(data['与 {{user}} 的关系']);
    if (data['初始情境/冲突']) $('#openingInitialConflict').val(data['初始情境/冲突']);
    if (data['补充说明']) $('#openingOutline').val(data['补充说明']);
}

function fillDialogue(data) {
    if (data['需要'] === '需要') $('#needDialogue').prop('checked', true).trigger('change');
    if (data['对应角色']) {
        const existing = $('#dialogueCharacter').val().trim();
        const role = data['对应角色'].trim();
        if (!existing) {
            $('#dialogueCharacter').val(role);
        } else if (!existing.split(/\s*\/\s*/).includes(role)) {
            $('#dialogueCharacter').val(existing + ' / ' + role);
        }
    }
    if (data['场景需求']) {
        const existing = $('#dialogueScenes').val().trim();
        const role = data['对应角色'] ? `【${data['对应角色']}】\n` : '';
        const block = role + data['场景需求'];
        $('#dialogueScenes').val(existing ? existing + '\n\n' + block : block);
    }
}

function fillInterview(data) {
    if (data['需要'] === '需要') $('#needInterview').prop('checked', true).trigger('change');
    if (data['对应角色']) {
        const existing = $('#interviewCharacter').val().trim();
        const role = data['对应角色'].trim();
        if (!existing) {
            $('#interviewCharacter').val(role);
        } else if (!existing.split(/\s*\/\s*/).includes(role)) {
            $('#interviewCharacter').val(existing + ' / ' + role);
        }
    }
    if (data['采访主题']) {
        const existing = $('#interviewTopics').val().trim();
        const role = data['对应角色'] ? `【${data['对应角色']}】\n` : '';
        const block = role + data['采访主题'];
        $('#interviewTopics').val(existing ? existing + '\n\n' + block : block);
    }
}

function fillPlayer(data) {
    if (data['需要'] === '需要') $('#needPlayer').prop('checked', true).trigger('change');
    if (data['设定深度']) {
        $('input[name="playerDepth"]').each(function() {
            if (data['设定深度'].includes($(this).val())) {
                $(this).prop('checked', true);
            }
        });
    }
    if (data['玩家角色大纲']) $('#playerOutline').val(data['玩家角色大纲']);
}

function fillMvu(data) {
    if (data['需要'] === '需要') $('#needMVU').prop('checked', true).trigger('change');
    
    if (data['组件选择']) {
        const selections = data['组件选择'].toLowerCase();
        if (selections.includes('核心')) $('#mvuCore').prop('checked', true);
        if (selections.includes('分阶段')) $('#mvu5').prop('checked', true);
        if (selections.includes('动态世界')) $('#mvu6').prop('checked', true);
        if (selections.includes('html状态栏')) $('#mvu7').prop('checked', true);
    }

    if (data['需要追踪的变量']) {
        $('#mvuVariablesContainer').empty(); // 清空默认的
        variableCount = 0;
        const vars = data['需要追踪的变量'].split('\n');
        vars.forEach(v => {
            const parts = v.replace(/^- /, '').split(':');
            if (parts.length >= 2) {
                addVariable();
                $(`#variable-${variableCount} .var-name`).val(parts[0].trim());
                $(`#variable-${variableCount} .var-desc`).val(parts.slice(1).join(':').trim());
            }
        });
    }

    if (data['分阶段角色设定说明']) $('#mvuStageSettings').val(data['分阶段角色设定说明']);
    if (data['动态世界内容说明']) $('#mvuDynamicWorld').val(data['动态世界内容说明']);
    if (data['HTML 状态栏显示需求']) $('#mvuHtmlDisplay').val(data['HTML 状态栏显示需求']);
    if (data['其他特殊说明']) $('#mvuNotes').val(data['其他特殊说明']);
}

function fillExtra(data) {
    if (data['特殊要求或补充说明']) $('#extraRequirements').val(data['特殊要求或补充说明']);
}
