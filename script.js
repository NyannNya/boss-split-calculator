const allocations = {}; // 用於儲存每個 BOSS 的分配設定
let bossItemsData = []; // 將從 CSV 加載的 BOSS 道具數據

// DOM 元素
const bossGroupsContainer = document.getElementById('boss-groups-container');
const addBossGroupButton = document.getElementById('add-boss-group');
const calculateButton = document.getElementById('calculate-button');
const resultTableBody = document.querySelector('#result-table tbody');
const shareLinkTextarea = document.getElementById('share-link');
const copyShareLinkButton = document.getElementById('copy-share-link');

// 函數：從 CSV 檔案載入 BOSS 道具數據
async function loadBossItemsData() {
    try {
        const response = await fetch('boss_items.csv');
        const text = await response.text();
        bossItemsData = parseCsv(text);
        console.log('BOSS 道具數據已載入:', bossItemsData);
    } catch (error) {
        console.error('載入 boss_items.csv 失敗:', error);
    }
}

// 函數：解析 CSV 數據
function parseCsv(text) {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',');
    return lines.slice(1).map(line => {
        const values = line.split(',');
        let obj = {};
        headers.forEach((header, i) => {
            obj[header.trim()] = values[i].trim();
        });
        return obj;
    });
}

// 函數：生成 BOSS 下拉選單選項
function generateBossOptions() {
    let options = '<option value="">請選擇 BOSS</option>';
    const uniqueBossNames = [...new Set(bossItemsData.map(item => item.boss_name))];
    uniqueBossNames.forEach(bossName => {
        options += `<option value="${bossName}">${bossName}</option>`;
    });
    return options;
}

// 函數：生成道具卡片
function generateItemCard(bossName, item, isChecked = false) {
    const itemCardDiv = document.createElement('div');
    itemCardDiv.classList.add('item-card');
    itemCardDiv.innerHTML = `
        <img src="${item.image_url}" alt="${item.item_name}">
        <p>${item.item_name}</p>
        <input type="checkbox" class="item-checkbox" data-item-name="${item.item_name}" ${isChecked ? 'checked' : ''}>
    `;
    return itemCardDiv;
}

// 函數：更新自訂分配比欄位
function updateCustomShareFields(bossGroupDiv, participants, currentAllocations = {}) {
    const customShareContainer = bossGroupDiv.querySelector('.custom-share-container');
    customShareContainer.innerHTML = '';
    if (bossGroupDiv.querySelector('.distribution-method[value="custom"]').checked) {
        participants.forEach(participant => {
            const shareGroup = document.createElement('div');
            shareGroup.classList.add('form-group', 'share-input-group');
            shareGroup.innerHTML = `
                <label>${participant} 比例 (%):</label>
                <input type="number" class="participant-share" data-participant="${participant}" min="0" value="${(currentAllocations[participant] * 100 || 0).toFixed(2)}">
            `;
            customShareContainer.appendChild(shareGroup);
        });
    }
}

// 函數：新增 BOSS 分配區塊
function addBossGroup(bossAllocationData = {}) {
    const bossGroupDiv = document.createElement('div');
    bossGroupDiv.classList.add('boss-group');
    const bossGroupId = `boss-group-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    bossGroupDiv.dataset.bossGroupId = bossGroupId;

    bossGroupDiv.innerHTML = `
        <div class="boss-header">
            <h3 class="boss-name-display">${bossAllocationData.bossName || '選擇 BOSS'}</h3>
            <select class="boss-name-select">
                ${generateBossOptions()}
            </select>
            <button class="remove-boss-group">移除此 BOSS</button>
        </div>

        <div class="allocation-settings">
            <h4>分配對象與比例</h4>
            <div class="form-group">
                <label>參與人員 (逗號分隔):</label>
                <input type="text" class="participants-input" placeholder="例如: PlayerA, PlayerB" value="${(bossAllocationData.participants || []).join(', ')}">
            </div>
            <div class="form-group">
                <label>分配方式:</label>
                <input type="radio" class="distribution-method" name="distribution-method-${bossGroupId}" value="average" ${bossAllocationData.distributionMethod === 'custom' ? '' : 'checked'}>
                <label>平均分配</label>
                <input type="radio" class="distribution-method" name="distribution-method-${bossGroupId}" value="custom" ${bossAllocationData.distributionMethod === 'custom' ? 'checked' : ''}>
                <label>自訂分配比</label>
            </div>
            <div class="custom-share-container" style="${bossAllocationData.distributionMethod === 'custom' ? 'display: block;' : 'display: none;'}">
                <!-- 自訂分配比輸入欄位將在此處動態生成 -->
            </div>
            <div class="form-group">
                <label>銷售手續費 (%):</label>
                <input type="number" class="fee-input" min="0" max="100" value="${bossAllocationData.fee !== undefined ? bossAllocationData.fee * 100 : 5}">
            </div>
        </div>

        <div class="boss-items-container">
            <h4>BOSS 掉落道具</h4>
            <div class="item-list">
                <!-- 道具列表將在此處動態生成 -->
            </div>
        </div>
    `;
    bossGroupsContainer.appendChild(bossGroupDiv);

    const bossNameSelect = bossGroupDiv.querySelector('.boss-name-select');
    const bossNameDisplay = bossGroupDiv.querySelector('.boss-name-display');
    const participantsInput = bossGroupDiv.querySelector('.participants-input');
    const distributionMethodRadios = bossGroupDiv.querySelectorAll(`.distribution-method[name="distribution-method-${bossGroupId}"]`);
    const customShareContainer = bossGroupDiv.querySelector('.custom-share-container');
    const itemListContainer = bossGroupDiv.querySelector('.item-list');

    // 填充 BOSS 名稱
    if (bossAllocationData.bossName) {
        bossNameSelect.value = bossAllocationData.bossName;
        bossNameDisplay.textContent = bossAllocationData.bossName;
        renderBossItems(bossGroupDiv, bossAllocationData.bossName, bossAllocationData.selectedItems || []);
    }

    // 更新自訂分配比欄位
    if (bossAllocationData.distributionMethod === 'custom' && bossAllocationData.participants) {
        updateCustomShareFields(bossGroupDiv, bossAllocationData.participants, bossAllocationData.allocations);
    }

    // 事件監聽器
    bossNameSelect.addEventListener('change', function() {
        const selectedBossName = this.value;
        bossNameDisplay.textContent = selectedBossName || '選擇 BOSS';
        renderBossItems(bossGroupDiv, selectedBossName, allocations[bossGroupId]?.selectedItems || []);
        updateAllocationsData();
    });

    participantsInput.addEventListener('input', function() {
        const participants = this.value.split(',').map(p => p.trim()).filter(p => p !== '');
        updateCustomShareFields(bossGroupDiv, participants, allocations[bossGroupId]?.allocations || {});
        updateAllocationsData();
    });

    distributionMethodRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.value === 'custom') {
                customShareContainer.style.display = 'block';
                const participants = participantsInput.value.split(',').map(p => p.trim()).filter(p => p !== '');
                updateCustomShareFields(bossGroupDiv, participants, allocations[bossGroupId]?.allocations || {});
            } else {
                customShareContainer.style.display = 'none';
            }
            updateAllocationsData();
        });
    });

    customShareContainer.addEventListener('input', function() {
        updateAllocationsData();
    });

    bossGroupDiv.querySelector('.fee-input').addEventListener('input', function() {
        updateAllocationsData();
    });

    bossGroupDiv.querySelector('.remove-boss-group').addEventListener('click', function() {
        delete allocations[bossGroupId];
        bossGroupDiv.remove();
        updateAllocationsData();
    });

    // 初始化時將數據存入 allocations
    updateAllocationsData();
}

// 函數：渲染 BOSS 掉落道具列表
function renderBossItems(bossGroupDiv, bossName, selectedItems = []) {
    const itemListContainer = bossGroupDiv.querySelector('.item-list');
    itemListContainer.innerHTML = '';
    const itemsForBoss = bossItemsData.filter(item => item.boss_name === bossName);

    itemsForBoss.forEach(item => {
        const isChecked = selectedItems.includes(item.item_name);
        const itemCard = generateItemCard(bossName, item, isChecked);
        itemListContainer.appendChild(itemCard);

        itemCard.querySelector('.item-checkbox').addEventListener('change', function() {
            updateAllocationsData();
        });
    });
}

// 函數：從輸入欄位讀取數據並更新 allocations 物件
function updateAllocationsData() {
    document.querySelectorAll('.boss-group').forEach(bossGroupDiv => {
        const bossGroupId = bossGroupDiv.dataset.bossGroupId;
        const bossName = bossGroupDiv.querySelector('.boss-name-select').value;
        const participantsInput = bossGroupDiv.querySelector('.participants-input').value;
        const participants = participantsInput.split(',').map(p => p.trim()).filter(p => p !== '');
        const distributionMethod = bossGroupDiv.querySelector('.distribution-method:checked').value;
        const fee = parseFloat(bossGroupDiv.querySelector('.fee-input').value) / 100 || 0;

        let currentAllocations = {};
        if (distributionMethod === 'custom') {
            let totalCustomShare = 0;
            bossGroupDiv.querySelectorAll('.participant-share').forEach(input => {
                const participant = input.dataset.participant;
                const share = parseFloat(input.value) || 0; // 這裡直接讀取百分比
                currentAllocations[participant] = share;
                totalCustomShare += share;
            });

            // 如果總和不為 100%，則按比例調整
            if (totalCustomShare > 0 && totalCustomShare !== 100) {
                console.warn(`BOSS ${bossName} 的自訂分配比總和不為 100%，將按比例調整。`);
                for (const p in currentAllocations) {
                    currentAllocations[p] /= totalCustomShare; // 轉換為小數
                }
            } else if (totalCustomShare === 100) {
                for (const p in currentAllocations) {
                    currentAllocations[p] /= 100; // 轉換為小數
                }
            }
        }

        const selectedItems = Array.from(bossGroupDiv.querySelectorAll('.item-checkbox:checked'))
                                .map(checkbox => checkbox.dataset.itemName);

        allocations[bossGroupId] = {
            bossName,
            participants,
            distributionMethod,
            allocations: currentAllocations,
            fee,
            selectedItems
        };
    });
    generateShareLink();
}

// 函數：計算分帳結果 (簡化版，僅顯示選中的道具和分配對象)
function calculateDistribution() {
    updateAllocationsData(); // 確保數據是最新的
    resultTableBody.innerHTML = '';

    let allTransactions = [];

    for (const bossGroupId in allocations) {
        const bossData = allocations[bossGroupId];
        if (!bossData.bossName || bossData.selectedItems.length === 0 || bossData.participants.length === 0) {
            continue; // 跳過不完整的 BOSS 區塊
        }

        // 這裡假設每個選中的道具價值為 1，以便計算份額
        const totalItemsValue = bossData.selectedItems.length;
        let distributedAmounts = {};

        if (bossData.distributionMethod === 'average') {
            const amountPerParticipant = totalItemsValue / bossData.participants.length;
            bossData.participants.forEach(p => {
                distributedAmounts[p] = amountPerParticipant;
            });
        } else { // custom
            let totalCustomShare = 0; // 這裡的 totalCustomShare 應該是百分比的總和
            bossData.participants.forEach(p => {
                totalCustomShare += (bossData.allocations[p] * 100) || 0; // 轉換回百分比計算總和
            });

            if (totalCustomShare > 0) {
                bossData.participants.forEach(p => {
                    // 使用儲存的小數比例來計算
                    distributedAmounts[p] = totalItemsValue * (bossData.allocations[p] || 0);
                });
            } else {
                // 如果自訂分配比總和為 0，則平均分配
                const amountPerParticipant = totalItemsValue / bossData.participants.length;
                bossData.participants.forEach(p => {
                    distributedAmounts[p] = amountPerParticipant;
                });
            }
        }

        bossData.participants.forEach(p => {
            allTransactions.push({
                boss: bossData.bossName,
                participant: p,
                share: distributedAmounts[p],
                items: bossData.selectedItems.join(', ')
            });
        });
    }

    if (allTransactions.length === 0) {
        const row = resultTableBody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 4;
        cell.textContent = '沒有可計算的分配結果。';
        cell.style.textAlign = 'center';
    } else {
        const table = document.getElementById('result-table');
        table.querySelector('thead').innerHTML = `
            <tr>
                <th>BOSS</th>
                <th>參與者</th>
                <th>應得份額 (道具數量)</th>
                <th>分配道具</th>
            </tr>
        `;
        allTransactions.forEach(tx => {
            const row = resultTableBody.insertRow();
            row.insertCell().textContent = tx.boss;
            row.insertCell().textContent = tx.participant;
            row.insertCell().textContent = tx.share.toFixed(2);
            row.insertCell().textContent = tx.items;
        });
    }
}

// 函數：生成分享連結
function generateShareLink() {
    const encodedData = btoa(JSON.stringify(allocations));
    const shareUrl = `${window.location.origin}${window.location.pathname}?allocations=${encodedData}`;
    shareLinkTextarea.value = shareUrl;
}

// 函數：從 URL 載入數據
function loadAllocationsFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const encodedData = urlParams.get('allocations');
    if (encodedData) {
        try {
            const decodedAllocations = JSON.parse(atob(encodedData));
            // 清空現有區塊
            bossGroupsContainer.innerHTML = '';
            // 重新渲染 BOSS 區塊
            for (const bossGroupId in decodedAllocations) {
                addBossGroup(decodedAllocations[bossGroupId]);
            }
            // 將載入的數據存回 allocations 物件
            Object.assign(allocations, decodedAllocations);
            updateAllocationsData(); // 確保數據同步
            calculateDistribution(); // 自動計算結果
        } catch (e) {
            console.error("解析 URL 數據失敗:", e);
            addBossGroup(); // 如果解析失敗，則添加一個空的 BOSS 區塊
        }
    } else {
        addBossGroup(); // 如果沒有 allocations 參數，則添加一個空的 BOSS 區塊
    }
}

// 事件監聽器
addBossGroupButton.addEventListener('click', () => addBossGroup());
calculateButton.addEventListener('click', calculateDistribution);

// 複製分享連結按鈕
copyShareLinkButton.addEventListener('click', () => {
    shareLinkTextarea.select();
    document.execCommand('copy');
    alert('分享連結已複製到剪貼簿！');
});

// 初始化：網頁載入時載入數據並初始化介面
window.addEventListener('load', async () => {
    await loadBossItemsData(); // 先載入 BOSS 道具數據
    loadAllocationsFromUrl(); // 再載入分配數據
});
