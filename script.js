let saveData = null;
let fileName = 'user1.dat';
let selectedCharmsToAdd = new Set();
let currentCrestIndex = 0; // 当前选中的战斗风格索引

document.getElementById('fileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        fileName = file.name;
    }
});

document.getElementById('parseBtn').addEventListener('click', async () => {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];

    if (!file) {
        showError('请先选择存档文件');
        return;
    }

    try {
        const arrayBuffer = await file.arrayBuffer();
        const fileData = new Uint8Array(arrayBuffer);

        saveData = await decryptSave(fileData);
        console.log('解析后的存档数据:', JSON.parse(JSON.stringify(saveData)));

        // 默认选中当前激活的战斗风格
        const currentCrestID = saveData.playerData.CurrentCrestID;
        const crestList = saveData.playerData.ToolEquips.savedData;
        currentCrestIndex = crestList.findIndex(c => c.Name === currentCrestID);
        if (currentCrestIndex === -1) currentCrestIndex = 0;

        displayContent();
        document.getElementById('content').style.display = 'block';
        document.getElementById('error').style.display = 'none';
    } catch (error) {
        showError(error.message);
    }
});

function displayContent() {
    displayCrestTabs();
    displayEquippedCharms();
    displayAvailableCharms();
    displayJournal();
}

function displayCrestTabs() {
    const tabsContainer = document.getElementById('crestTabs');
    const infoContainer = document.getElementById('crestInfo');
    tabsContainer.innerHTML = '';

    const crestList = saveData.playerData.ToolEquips.savedData;
    const currentCrestID = saveData.playerData.CurrentCrestID;

    crestList.forEach((crest, index) => {
        const tab = document.createElement('button');
        tab.className = 'crest-tab' + (index === currentCrestIndex ? ' active' : '');
        const isActive = crest.Name === currentCrestID;
        tab.innerHTML = `${crest.Name}${isActive ? ' ⚔️' : ''}`;
        tab.title = isActive ? '当前激活的战斗风格' : '点击切换编辑此风格';
        tab.addEventListener('click', () => {
            currentCrestIndex = index;
            selectedCharmsToAdd.clear();
            displayCrestTabs();
            displayEquippedCharms();
            displayAvailableCharms();
        });
        tabsContainer.appendChild(tab);
    });

    const currentCrest = crestList[currentCrestIndex];
    infoContainer.innerHTML = `
        <span>正在编辑: <strong>${currentCrest.Name}</strong></span>
        <span class="crest-status">${currentCrest.Data.IsUnlocked ? '✅ 已解锁' : '🔒 未解锁'}</span>
    `;

    document.getElementById('currentCrestLabel').textContent = `— ${currentCrest.Name}`;
}

function displayEquippedCharms() {
    const equippedList = document.getElementById('equippedCharmsList');
    equippedList.innerHTML = '';

    const toolEquips = saveData.playerData.ToolEquips.savedData[currentCrestIndex].Data.Slots;
    let hasEquipped = false;

    toolEquips.forEach((slot, index) => {
        if (slot.EquippedTool && slot.EquippedTool !== '') {
            hasEquipped = true;
            const charmDiv = document.createElement('div');
            charmDiv.className = 'charm-item';
            charmDiv.innerHTML = `
                <input type="checkbox" ${slot.IsUnlocked ? 'checked' : ''}
                       onchange="toggleCharmSlot(${index}, this.checked)">
                <span class="charm-name">${slot.EquippedTool}</span>
                <span class="slot-index">槽位 ${index + 1}</span>
                <button class="remove-btn" onclick="unequipCharm(${index})">卸下</button>
            `;
            equippedList.appendChild(charmDiv);
        }
    });

    if (!hasEquipped) {
        equippedList.innerHTML = '<p style="color: #ffcccc; text-align: center;">暂无装备护符</p>';
    }
}

function displayAvailableCharms() {
    const availableList = document.getElementById('availableCharmsList');
    availableList.innerHTML = '';

    const allTools = saveData.playerData.Tools.savedData;

    // 获取当前风格已装备的护符名称
    const equippedCharms = saveData.playerData.ToolEquips.savedData[currentCrestIndex].Data.Slots
        .filter(slot => slot.EquippedTool && slot.EquippedTool !== '')
        .map(slot => slot.EquippedTool);

    const availableCharms = allTools.filter(tool =>
        tool.Data.IsUnlocked && !equippedCharms.includes(tool.Name)
    );

    if (availableCharms.length === 0) {
        availableList.innerHTML = '<p style="color: #ffcccc; text-align: center;">没有可用的未装备护符</p>';
        return;
    }

    availableCharms.forEach(tool => {
        const charmDiv = document.createElement('div');
        charmDiv.className = 'available-charm-item';
        const safeId = CSS.escape(tool.Name);
        charmDiv.innerHTML = `
            <input type="checkbox" id="charm_${safeId}"
                   onchange="toggleCharmSelection('${tool.Name.replace(/'/g, "\\'")}', this.checked)">
            <label for="charm_${safeId}" class="charm-name">${tool.Name}</label>
        `;
        availableList.appendChild(charmDiv);
    });
}

function toggleCharmSelection(charmName, selected) {
    if (selected) {
        selectedCharmsToAdd.add(charmName);
    } else {
        selectedCharmsToAdd.delete(charmName);
    }
}

document.getElementById('addSelectedCharmsBtn').addEventListener('click', () => {
    if (selectedCharmsToAdd.size === 0) {
        showError('请先选择要添加的护符');
        return;
    }

    const slots = saveData.playerData.ToolEquips.savedData[currentCrestIndex].Data.Slots;
    const addCount = selectedCharmsToAdd.size;

    selectedCharmsToAdd.forEach(charmName => {
        slots.push({
            EquippedTool: charmName,
            IsUnlocked: true
        });
    });

    selectedCharmsToAdd.clear();
    displayEquippedCharms();
    displayAvailableCharms();
    showSuccess(`成功向 ${saveData.playerData.ToolEquips.savedData[currentCrestIndex].Name} 添加了 ${addCount} 个护符`);
});

function toggleCharmSlot(index, unlocked) {
    saveData.playerData.ToolEquips.savedData[currentCrestIndex].Data.Slots[index].IsUnlocked = unlocked;
}

function unequipCharm(index) {
    const slots = saveData.playerData.ToolEquips.savedData[currentCrestIndex].Data.Slots;
    slots.splice(index, 1);
    displayEquippedCharms();
    displayAvailableCharms();
}

function displayJournal() {
    const journalList = document.getElementById('journalList');
    journalList.innerHTML = '';

    const enemies = saveData.playerData.EnemyJournalKillData.list;

    enemies.forEach((enemy, index) => {
        const journalDiv = document.createElement('div');
        journalDiv.className = 'journal-item';
        journalDiv.innerHTML = `
            <div class="journal-name">${enemy.Name}</div>
            <div class="journal-stats">
                <label>
                    击杀数:
                    <input type="number" value="${enemy.Record.Kills}"
                           onchange="updateKills(${index}, this.value)">
                </label>
                <label>
                    <input type="checkbox" ${enemy.Record.HasBeenSeen ? 'checked' : ''}
                           onchange="updateSeen(${index}, this.checked)">
                    已发现
                </label>
            </div>
        `;
        journalList.appendChild(journalDiv);
    });
}

function updateKills(index, value) {
    saveData.playerData.EnemyJournalKillData.list[index].Record.Kills = parseInt(value);
}

function updateSeen(index, seen) {
    saveData.playerData.EnemyJournalKillData.list[index].Record.HasBeenSeen = seen;
}

document.getElementById('downloadBtn').addEventListener('click', async () => {
    try {
        const encryptedData = await encryptSave(saveData);

        const blob = new Blob([encryptedData], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);

        showSuccess('存档下载成功！');
    } catch (error) {
        showError('下载失败: ' + error.message);
    }
});

function showError(message) {
    const errorDiv = document.getElementById('error');
    errorDiv.textContent = '❌ ' + message;
    errorDiv.style.display = 'block';
    errorDiv.style.background = 'rgba(255, 0, 0, 0.3)';
    errorDiv.style.borderColor = '#ff0000';
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 3000);
}

function showSuccess(message) {
    const errorDiv = document.getElementById('error');
    errorDiv.textContent = '✅ ' + message;
    errorDiv.style.display = 'block';
    errorDiv.style.background = 'rgba(0, 255, 0, 0.3)';
    errorDiv.style.borderColor = '#00ff00';
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 3000);
}
