// 全局數據
const allocations = {}; // 用於儲存每個 BOSS 的分配設定
let bossItemsData = []; // 將從 CSV 加載的 BOSS 道具數據
let globalMembers = []; // 全局參與人員和錢包列表

// DOM 元素
const globalMembersContainer = document.getElementById('global-members-container');
const addMemberButton = document.getElementById('add-member-button');
const bossGroupsContainer = document.getElementById('boss-groups-container');
const addBossGroupButton = document.getElementById('add-boss-group');
const calculateButton = document.getElementById('calculate-button'); // 可能在 DOM 尚未加入時為 null
const calculateButtonTop = document.getElementById('calculate-button-top');
const resetButton = document.getElementById('reset-button');
const csvStatus = document.getElementById('csv-status');
const toastContainer = document.getElementById('toast-container');
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
        // 檢查 bossItemsData 是否有內容
        if (bossItemsData.length === 0) {
            console.warn('boss_items.csv 載入成功，但數據為空。請檢查 CSV 檔案內容。');
            setCsvStatus('error', 'CSV 內容為空');
            showToast('讀取到空的 CSV，請檢查檔案內容。', 'error');
        } else {
            setCsvStatus('success', `CSV 已載入 (${bossItemsData.length} 筆)`);
            showToast('CSV 載入完成', 'success');
        }
    } catch (error) {
        console.error('載入 boss_items.csv 失敗:', error);
        setCsvStatus('error', 'CSV 載入失敗');
        showToast('載入 BOSS 道具數據失敗，請確認 boss_items.csv 是否存在且可讀取。', 'error');
    }
}

// 函數：解析 CSV 數據
function parseCsv(text) {
    // 正規化換行符，並處理引號包覆的欄位（允許逗點）
    const lines = text.replace(/\r\n?|\n/g, '\n').trim().split('\n');
    if (lines.length === 0) return [];

    const parseLine = (line) => {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
                // 連續兩個雙引號代表跳脫
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++; // 跳過下一個引號
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (ch === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += ch;
            }
        }
        result.push(current);
        return result.map(v => v.trim());
    };

    // 去除 BOM 並取得欄位名稱
    let headers = parseLine(lines[0]);
    if (headers.length > 0) {
        headers[0] = headers[0].replace(/^\uFEFF/, '');
    }
    return lines.slice(1).filter(l => l.trim().length > 0).map(line => {
        const values = parseLine(line);
        const obj = {};
        headers.forEach((header, i) => {
            obj[header.trim()] = (values[i] ?? '').trim();
        });
        return obj;
    });
}

// 函數：生成 BOSS 下拉選單選項
function generateBossOptions() {
    let options = '<option value="">請選擇 BOSS</option>';
    const uniqueBossNames = [...new Set(bossItemsData.map(item => item.boss_name))];
    if (uniqueBossNames.length === 0) {
        console.warn('沒有可用的 BOSS 名稱，請檢查 boss_items.csv 檔案。');
    }
    uniqueBossNames.forEach(bossName => {
        options += `<option value="${bossName}">${bossName}</option>`;
    });
    return options;
}

// 函數：生成道具卡片
function generateItemCard(bossName, item, isChecked = false, nesoAmount = 0) {
    const itemCardDiv = document.createElement('div');
    itemCardDiv.classList.add('item-card');
    let nesoInputHtml = '';
    if (item.item_name.includes('neso')) {
        nesoInputHtml = `<input type="number" class="neso-amount-input" placeholder="NESO 數量" value="${nesoAmount}" min="0">`;
    }
    itemCardDiv.innerHTML = `
        <img src="${item.image_url}" alt="${item.item_name}">
        <p>${item.item_name}</p>
        ${nesoInputHtml}
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
                <input type="number" class="participant-share" data-participant="${participant}" min="0" value="${(currentAllocations[participant] !== undefined ? (currentAllocations[participant] * 100).toFixed(2) : 0)}">
            `;
            customShareContainer.appendChild(shareGroup);
        });
    }
}


// 函數：新增人員和錢包輸入組
function addMemberInput(memberName = '', memberWallet = '') {
    const memberInputGroup = document.createElement('div');
    memberInputGroup.classList.add('member-input-group');
    memberInputGroup.innerHTML = `
        <label>人員:</label>
        <input type="text" class="member-name-input" placeholder="例如: PlayerA" value="${memberName}">
        <label>錢包:</label>
        <input type="text" class="member-wallet-input" placeholder="例如: 0xabc...xyz" value="${memberWallet}">
        <button class="remove-member-input">移除</button>
    `;
    globalMembersContainer.appendChild(memberInputGroup);

    memberInputGroup.querySelector('.remove-member-input').addEventListener('click', function() {
        memberInputGroup.remove();
        updateGlobalMembers();
        updateParticipantsCheckboxes();
    });

    memberInputGroup.querySelector('.member-name-input').addEventListener('input', function() {
        updateGlobalMembers();
        updateParticipantsCheckboxes();
    });

    memberInputGroup.querySelector('.member-wallet-input').addEventListener('input', function() {
        updateGlobalMembers();
    });

    updateGlobalMembers(); // 初始化時更新全局成員數據
}

// 函數：更新全局參與人員和錢包列表
function updateGlobalMembers() {
    globalMembers = [];
    document.querySelectorAll('.member-input-group').forEach(group => {
        const nameInput = group.querySelector('.member-name-input');
        const walletInput = group.querySelector('.member-wallet-input');
        const name = nameInput.value.trim();
        const wallet = walletInput.value.trim();
        if (name !== '') {
            globalMembers.push({ name, wallet });
        }
    });
    generateShareLink(); // 更新分享連結以包含全局成員數據
}

// 函數：更新所有 BOSS 區塊中的參與人員勾選框
function updateParticipantsCheckboxes() {
    const allParticipants = globalMembers.map(member => member.name).filter(name => name !== '');
    document.querySelectorAll('.participants-checkbox-container').forEach(container => {
        const bossGroupDiv = container.closest('.boss-group');
        const bossGroupId = bossGroupDiv.dataset.bossGroupId;
        const currentSelectedParticipants = allocations[bossGroupId]?.participants || [];

        container.innerHTML = '';
        allParticipants.forEach(p => {
            const isChecked = currentSelectedParticipants.includes(p);
            const checkboxId = `participant-${bossGroupId}-${p.replace(/\s/g, '-')}`;
            const checkboxHtml = `
                <input type="checkbox" id="${checkboxId}" class="participant-checkbox" value="${p}" ${isChecked ? 'checked' : ''}>
                <label for="${checkboxId}">${p}</label>
            `;
            container.insertAdjacentHTML('beforeend', checkboxHtml);
        });

        // 重新綁定事件監聽器
        container.querySelectorAll('.participant-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const selectedParticipants = Array.from(container.querySelectorAll('.participant-checkbox:checked')).map(cb => cb.value);
                updateCustomShareFields(bossGroupDiv, selectedParticipants, allocations[bossGroupId]?.allocations || {});
                updateAllocationsData();
            });
        });

        // 處理全選按鈕的狀態
        const selectAllButton = bossGroupDiv.querySelector('.select-all-participants');
        if (selectAllButton) {
            const allChecked = allParticipants.every(p => currentSelectedParticipants.includes(p));
            selectAllButton.textContent = allChecked ? '取消全選' : '全選';
        }
    });
    updateAllocationsData(); // 更新數據以反映參與者變化
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
                <label>參與人員:</label>
                <button class="select-all-participants">全選</button>
                <div class="participants-checkbox-container">
                    <!-- 全局參與人員勾選框將在此處動態生成 -->
                </div>
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
    const selectAllParticipantsButton = bossGroupDiv.querySelector('.select-all-participants'); // 新增全選按鈕引用
    const participantsCheckboxContainer = bossGroupDiv.querySelector('.participants-checkbox-container');
    const distributionMethodRadios = bossGroupDiv.querySelectorAll(`.distribution-method[name="distribution-method-${bossGroupId}"]`);
    const customShareContainer = bossGroupDiv.querySelector('.custom-share-container');
    const itemListContainer = bossGroupDiv.querySelector('.item-list');

    // 填充 BOSS 名稱
    if (bossAllocationData.bossName) {
        bossNameSelect.value = bossAllocationData.bossName;
        bossNameDisplay.textContent = bossAllocationData.bossName;
        renderBossItems(bossGroupDiv, bossAllocationData.bossName, bossAllocationData.selectedItems || []);
    }

    // 填充參與人員勾選框
    updateParticipantsCheckboxes(); // 初始化時更新勾選框

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

    distributionMethodRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.value === 'custom') {
                customShareContainer.style.display = 'block';
                const selectedParticipants = Array.from(participantsCheckboxContainer.querySelectorAll('.participant-checkbox:checked')).map(cb => cb.value);
                updateCustomShareFields(bossGroupDiv, selectedParticipants, allocations[bossGroupId]?.allocations || {});
            } else {
                customShareContainer.style.display = 'none';
            }
            updateAllocationsData();
        });
    });

    customShareContainer.addEventListener('input', function() {
        // 即時驗證自訂比例總和
        const inputs = customShareContainer.querySelectorAll('.participant-share');
        let sum = 0;
        inputs.forEach(i => { sum += parseFloat(i.value) || 0; });
        if (sum !== 100) {
            customShareContainer.dataset.invalid = 'true';
            customShareContainer.title = `目前總和為 ${sum.toFixed(2)}%，需等於 100%`;
        } else {
            customShareContainer.dataset.invalid = 'false';
            customShareContainer.title = '';
        }
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

    // 全選/取消全選按鈕事件監聽器
    selectAllParticipantsButton.addEventListener('click', function() {
        const allCheckboxes = participantsCheckboxContainer.querySelectorAll('.participant-checkbox');
        const allChecked = Array.from(allCheckboxes).every(cb => cb.checked);

        allCheckboxes.forEach(checkbox => {
            checkbox.checked = !allChecked;
        });

        // 更新自訂分配比欄位和數據
        const selectedParticipants = Array.from(participantsCheckboxContainer.querySelectorAll('.participant-checkbox:checked')).map(cb => cb.value);
        updateCustomShareFields(bossGroupDiv, selectedParticipants, allocations[bossGroupId]?.allocations || {});
        updateAllocationsData();

        // 更新按鈕文字
        this.textContent = allChecked ? '全選' : '取消全選';
    });
}

// 函數：渲染 BOSS 掉落道具列表
function renderBossItems(bossGroupDiv, bossName, selectedItems = []) {
    const itemListContainer = bossGroupDiv.querySelector('.item-list');
    itemListContainer.innerHTML = '';
    const itemsForBoss = bossItemsData.filter(item => item.boss_name === bossName);

    itemsForBoss.forEach(item => {
        const isChecked = selectedItems.some(selected => selected.name === item.item_name);
        const existingNesoItem = selectedItems.find(selected => selected.name === item.item_name && selected.nesoAmount !== undefined);
        const nesoAmount = existingNesoItem ? existingNesoItem.nesoAmount : 0;
        const itemCard = generateItemCard(bossName, item, isChecked, nesoAmount);
        itemListContainer.appendChild(itemCard);

        itemCard.querySelector('.item-checkbox').addEventListener('change', function() {
            updateAllocationsData();
        });

        const nesoAmountInput = itemCard.querySelector('.neso-amount-input');
        if (nesoAmountInput) {
            nesoAmountInput.addEventListener('input', function() {
                updateAllocationsData();
            });
        }
    });
}

// 函數：從輸入欄位讀取數據並更新 allocations 物件
function updateAllocationsData() {
    // globalMembers 已經由 updateGlobalMembers 函數更新

    document.querySelectorAll('.boss-group').forEach(bossGroupDiv => {
        const bossGroupId = bossGroupDiv.dataset.bossGroupId;
        const bossName = bossGroupDiv.querySelector('.boss-name-select').value;
        const participants = Array.from(bossGroupDiv.querySelectorAll('.participant-checkbox:checked')).map(checkbox => checkbox.value);
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
            } else if (totalCustomShare === 0 && participants.length > 0) {
                // 如果總和為 0 且有參與者，則將所有分配比設為 0
                participants.forEach(p => {
                    currentAllocations[p] = 0;
                });
            }
        }

        const selectedItems = Array.from(bossGroupDiv.querySelectorAll('.item-checkbox:checked'))
                                .map(checkbox => {
                                    const itemName = checkbox.dataset.itemName;
                                    if (itemName.includes('neso')) {
                                        const nesoAmountInput = checkbox.closest('.item-card').querySelector('.neso-amount-input');
                                        return { name: itemName, nesoAmount: parseFloat(nesoAmountInput.value) || 0 };
                                    }
                                    return { name: itemName };
                                });

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

        let totalItemsValue = 0;
        bossData.selectedItems.forEach(item => {
            if (item.name.includes('neso')) {
                totalItemsValue += item.nesoAmount;
            } else {
                totalItemsValue += 1; // 其他道具假設價值為 1
            }
        });
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
                // 如果自訂分配比總和為 0，則將所有分配比設為 0
                bossData.participants.forEach(p => {
                    distributedAmounts[p] = 0;
                });
            }
        }

        bossData.participants.forEach(p => {
            allTransactions.push({
                boss: bossData.bossName,
                participant: p,
                share: distributedAmounts[p],
                items: bossData.selectedItems.map(item => {
                    if (item.name.includes('neso')) {
                        return `${item.name} (${item.nesoAmount})`;
                    }
                    return item.name;
                }).join(', ')
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
                <th>應得份額 (價值)</th>
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
    const dataToEncode = {
        allocations: allocations,
        globalMembers: globalMembers // 將全局成員數據也包含在分享連結中
    };
    const encodedData = btoa(JSON.stringify(dataToEncode));
    const shareUrl = `${window.location.origin}${window.location.pathname}?data=${encodedData}`;
    shareLinkTextarea.value = shareUrl;
}

// 狀態與提示工具
function setCsvStatus(kind, text) {
    if (!csvStatus) return;
    csvStatus.classList.remove('status-loading', 'status-success', 'status-error');
    csvStatus.classList.add(`status-${kind}`);
    csvStatus.textContent = text;
}

function showToast(message, type = 'info', duration = 2500) {
    if (!toastContainer) return;
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = message;
    toastContainer.appendChild(el);
    setTimeout(() => {
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 300);
    }, duration);
}

// 函數：從 URL 載入數據
function loadAllocationsFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const encodedData = urlParams.get('data'); // 從 'data' 參數獲取數據
    if (encodedData) {
        try {
            const decodedData = JSON.parse(atob(encodedData));
            const decodedAllocations = decodedData.allocations;
            const decodedGlobalMembers = decodedData.globalMembers;

            // 載入全局參與人員和錢包
            if (decodedGlobalMembers && Array.isArray(decodedGlobalMembers)) {
                globalMembersContainer.innerHTML = ''; // 清空現有輸入
                decodedGlobalMembers.forEach(member => {
                    addMemberInput(member.name, member.wallet);
                });
                globalMembers = decodedGlobalMembers;
            }

            // 清空現有區塊
            bossGroupsContainer.innerHTML = '';
            // 重新渲染 BOSS 區塊
            for (const bossGroupId in decodedAllocations) {
                if (bossGroupId !== 'globalMembers') { // 排除全局參與人員
                    addBossGroup(decodedAllocations[bossGroupId]);
                }
            }
            // 將載入的數據存回 allocations 物件
            Object.assign(allocations, decodedAllocations);
            updateParticipantsCheckboxes(); // 更新所有 BOSS 區塊的參與者勾選框
            updateAllocationsData(); // 確保數據同步
            calculateDistribution(); // 自動計算結果
        } catch (e) {
            console.error("解析 URL 數據失敗:", e);
            addMemberInput(); // 如果解析失敗，則添加一個空的成員輸入組
            addBossGroup(); // 如果解析失敗，則添加一個空的 BOSS 區塊
        }
    } else {
        addMemberInput(); // 如果沒有 allocations 參數，則添加一個空的成員輸入組
        addBossGroup(); // 如果沒有 allocations 參數，則添加一個空的 BOSS 區塊
    }
}

// 事件監聽器
addMemberButton.addEventListener('click', () => addMemberInput()); // 監聽新增人員按鈕
addBossGroupButton.addEventListener('click', () => addBossGroup());
if (calculateButton) {
    calculateButton.addEventListener('click', calculateDistribution);
}
if (calculateButtonTop) {
    calculateButtonTop.addEventListener('click', calculateDistribution);
}
if (resetButton) {
    resetButton.addEventListener('click', () => {
        // 重設所有狀態
        allocationsCount = 0;
        bossGroupsContainer.innerHTML = '';
        globalMembersContainer.innerHTML = '';
        addMemberInput();
        addBossGroup();
        updateGlobalMembers();
        updateParticipantsCheckboxes();
        resultTableBody.innerHTML = '';
        shareLinkTextarea.value = '';
        showToast('已重設為初始狀態', 'info');
        generateShareLink();
    });
}

// 複製分享連結按鈕
copyShareLinkButton.addEventListener('click', () => {
    shareLinkTextarea.select();
    document.execCommand('copy');
    alert('分享連結已複製到剪貼簿！');
});

// 初始化：網頁載入時載入數據並初始化介面
window.addEventListener('load', async () => {
    setCsvStatus && setCsvStatus('loading', '資料載入中…');
    await loadBossItemsData(); // 先載入 BOSS 道具數據
    loadAllocationsFromUrl(); // 再載入分配數據
    updateParticipantsCheckboxes(); // 確保初始時參與者勾選框正確
    updateGlobalMembers(); // 確保初始時全局成員數據正確
});

// 若計算按鈕在 DOM 初始化後才出現，已於上方以保護方式註冊
