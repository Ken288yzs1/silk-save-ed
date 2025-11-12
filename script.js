let saveData = null;
let fileName = 'user1.dat';

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
    displayCharms();
    displayJournal();
}

function displayCharms() {
    const charmsList = document.getElementById('charmsList');
    charmsList.innerHTML = '';

    const toolEquips = saveData.playerData.ToolEquips.savedData[0].Data.Slots;

    toolEquips.forEach((slot, index) => {
        if (slot.EquippedTool) {
            const charmDiv = document.createElement('div');
            charmDiv.className = 'charm-item';
            charmDiv.innerHTML = `
                <input type="checkbox" ${slot.IsUnlocked ? 'checked' : ''}
                       onchange="toggleCharmSlot(${index}, this.checked)">
                <span class="charm-name">${slot.EquippedTool}</span>
                <button class="remove-btn" onclick="removeCharm(${index})">移除</button>
            `;
            charmsList.appendChild(charmDiv);
        }
    });
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

function toggleCharmSlot(index, unlocked) {
    saveData.playerData.ToolEquips.savedData[0].Data.Slots[index].IsUnlocked = unlocked;
}

function removeCharm(index) {
    const slots = saveData.playerData.ToolEquips.savedData[0].Data.Slots;
    delete slots[index].EquippedTool;
    displayCharms();
}

document.getElementById('addCharmBtn').addEventListener('click', () => {
    const charmName = document.getElementById('newCharmName').value.trim();
    if (!charmName) {
        showError('请输入护符名称');
        return;
    }

    const slots = saveData.playerData.ToolEquips.savedData[0].Data.Slots;
    const emptySlotIndex = slots.findIndex(slot => !slot.EquippedTool);

    if (emptySlotIndex === -1) {
        showError('没有可用的槽位');
        return;
    }

    slots[emptySlotIndex] = {
        EquippedTool: charmName,
        IsUnlocked: true
    };

    document.getElementById('newCharmName').value = '';
    displayCharms();
});

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
    } catch (error) {
        showError('下载失败: ' + error.message);
    }
});

function showError(message) {
    const errorDiv = document.getElementById('error');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 3000);
}
