let saveData = null;
let fileName = 'user1.dat';
let selectedCharmsToAdd = new Set();

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

        displayContent();
        document.getElementById('content').style.display = 'block';
        document.getElementById('error').style.display = 'none';
    } catch (error) {
        showError(error.message);
    }
});

function displayContent() {
    displayEquippedCharms();
    displayAvailableCharms();
    displayJournal();
}

function displayEquippedCharms() {
    const equippedList = document.getElementById('equippedCharmsList');
    equippedList.innerHTML = '';

    const toolEquips = saveData.playerData.ToolEquips.savedData[0].Data.Slots;

    toolEquips.forEach((slot, index) => {
        if (slot.EquippedTool) {
            const charmDiv = document.createElement('div');
            charmDiv.className = 'charm-item';
            charmDiv.innerHTML = `
                <input type="checkbox" ${slot.IsUnlocked ? 'checked' : ''}
                       onchange="toggleCharmSlot(${index}, this.checked)">
                <span class="charm-name">${slot.EquippedTool}</span>
                <button class="remove-btn" onclick="unequipCharm(${index})">卸下</button>
            `;
            equippedList.appendChild(charmDiv);
        }
    });

    if (toolEquips.filter(s => s.EquippedTool).length === 0) {
        equippedList.innerHTML = '<p style="color: #ffcccc; text-align: center;">暂无装备护符</p>';
    }
}

function displayAvailableCharms() {
    const availableList = document.getElementById('availableCharmsList');
    availableList.innerHTML = '';

    // 获取所有已拥有的护符
    const allTools = saveData.playerData.Tools.savedData;

    // 获取已装备的护符名称
    const equippedCharms = saveData.playerData.ToolEquips.savedData[0].Data.Slots
        .filter(slot => slot.EquippedTool)
        .map(slot => slot.EquippedTool);

    // 筛选出未装备的护符
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
        charmDiv.innerHTML = `
            <input type="checkbox" id="charm_${tool.Name}"
                   onchange="toggleCharmSelection('${tool.Name}', this.checked)">
            <label for="charm_${tool.Name}" class="charm-name">${tool.Name}</label>
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

    const slots = saveData.playerData.ToolEquips.savedData[0].Data.Slots;

    selectedCharmsToAdd.forEach(charmName => {
        // 尝试找到空槽位
        let emptySlotIndex = slots.findIndex(slot => !slot.EquippedTool);

        if (emptySlotIndex === -1) {
            // 如果没有空槽位，直接添加新槽位（即使槽位不够也可以添加）
            slots.push({
                EquippedTool: charmName,
                IsUnlocked: true
            });
        } else {
            // 如果有空槽位，使用空槽位
            slots[emptySlotIndex] = {
                EquippedTool: charmName,
                IsUnlocked: true
            };
        }
    });

    // 清空选择
    selectedCharmsToAdd.clear();

    // 刷新显示
    displayEquippedCharms();
    displayAvailableCharms();

    showSuccess(`成功添加 ${selectedCharmsToAdd.size} 个护符`);
});

function toggleCharmSlot(index, unlocked) {
    saveData.playerData.ToolEquips.savedData[0].Data.Slots[index].IsUnlocked = unlocked;
}

function unequipCharm(index) {
    const slots = saveData.playerData.ToolEquips.savedData[0].Data.Slots;

    // 如果是额外添加的槽位（超出7个），直接删除
    if (index >= 7) {
        slots.splice(index, 1);
    } else {
        // 如果是原有的7个槽位，只清空装备
        delete slots[index].EquippedTool;
        slots[index].IsUnlocked = false;
    }

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
        // 在序列化前确保格式正确（逗号在左花括号后面）
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
