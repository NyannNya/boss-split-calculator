// 全局數據
const allocations = {}; // 用於儲存每個 BOSS 的分配設定
let bossItemsData = []; // 將從 CSV 加載的 BOSS 道具數據
// NESO 不固定金額：固定顯示 NESO 1/2/3，預設 0
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
        // 過濾掉 CSV 中含 neso 的列，NESO 改由 boss_neso.csv 提供
        bossItemsData = parseCsv(text).filter(r => !(r.item_name || '').toLowerCase().includes('neso'));
        console.log('BOSS 道具數據已載入:', bossItemsData);
        // 檢查 bossItemsData 是否有內容
        if (bossItemsData.length === 0) {
            console.warn('boss_items.csv 載入成功，但數據為空。請檢查 CSV 檔案內容。');
            setCsvStatus('error', 'CSV 內容為空');
            showToast('讀取到空的 CSV，請檢查檔案內容。', 'error');
        } else {
            setCsvStatus('success', `道具 CSV 已載入 (${bossItemsData.length} 筆)`);
            showToast('道具 CSV 載入完成', 'success');
        }
    } catch (error) {
        console.error('載入 boss_items.csv 失敗:', error);
        setCsvStatus('error', 'CSV 載入失敗');
        showToast('載入 BOSS 道具數據失敗，請確認 boss_items.csv 是否存在且可讀取。', 'error');
    }
}

// 不再需要載入 boss_neso.csv

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

// 函數：生成道具卡片（含售價與持有者選擇）
function generateItemCard(bossName, item, isChecked = false, nesoAmount = 0, price = '', owner = '') {
    const itemCardDiv = document.createElement('div');
    itemCardDiv.classList.add('item-card');
    itemCardDiv.dataset.itemName = item.item_name;
    let nesoInputHtml = '';
    const isNeso = item.item_name.toLowerCase().includes('neso');
    if (isNeso) {
        nesoInputHtml = `<input type="number" class="neso-amount-input" placeholder="NESO 數量" value="${nesoAmount}" min="0">`;
    }
    const priceInputHtml = !isNeso ? `<input type="number" class="item-price-input" placeholder="售價 (自動扣手續費)" value="${price !== undefined && price !== null ? price : ''}" min="0" step="0.01">` : '';
    const ownerSelectHtml = `<select class="item-owner-select" data-default-owner="${owner}"></select>`;
    itemCardDiv.innerHTML = `
        <img src="${item.image_url}" alt="${item.item_name}">
        <p>${item.item_name}</p>
        ${priceInputHtml}
        ${nesoInputHtml}
        <div class="owner-row">
            ${ownerSelectHtml}
        </div>
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
        // 僅允許英數、空白、底線與連字號
        const allowed = this.value.replace(/[^A-Za-z0-9 _-]/g, '');
        if (allowed !== this.value) {
            this.value = allowed;
        }
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
    renderNesoSummary(); // 更新 NESO 總結
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
            const wrapper = document.createElement('label');
            wrapper.className = `participant-chip ${isChecked ? 'checked' : ''}`;
            wrapper.setAttribute('for', checkboxId);
            const input = document.createElement('input');
            input.type = 'checkbox';
            input.id = checkboxId;
            input.className = 'participant-checkbox';
            input.value = p;
            input.checked = isChecked;
            const span = document.createElement('span');
            span.textContent = p;
            wrapper.appendChild(input);
            wrapper.appendChild(span);
            container.appendChild(wrapper);
        });

        // 重新綁定事件監聽器
        container.querySelectorAll('.participant-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const label = checkbox.closest('.participant-chip');
                if (label) label.classList.toggle('checked', checkbox.checked);
                const selectedParticipants = Array.from(container.querySelectorAll('.participant-checkbox:checked')).map(cb => cb.value);
                updateCustomShareFields(bossGroupDiv, selectedParticipants, allocations[bossGroupId]?.allocations || {});
                populateOwnerSelects(bossGroupDiv, selectedParticipants);
                updateAllocationsData();
            });
        });

        // 處理全選 chip 的狀態
        const selectAllChip = bossGroupDiv.querySelector('.select-all-participants');
        const selectAllCheckbox = bossGroupDiv.querySelector('.select-all-checkbox');
        if (selectAllChip && selectAllCheckbox) {
            const allChecked = allParticipants.length > 0 && allParticipants.every(p => currentSelectedParticipants.includes(p));
            selectAllCheckbox.checked = allChecked;
            selectAllChip.classList.toggle('checked', allChecked);
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
                <label class="participant-chip select-all-participants" title="全選/取消全選">
                    <input type="checkbox" class="select-all-checkbox" />
                    <span>全選</span>
                </label>
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
            <div class="form-group">
                <label>顯示選項:</label>
                <label class="participant-chip" title="隱藏未設定的道具">
                    <input type="checkbox" class="hide-unset-toggle" ${bossAllocationData.hideUnset ? 'checked' : ''}>
                    <span>隱藏未設定道具</span>
                </label>
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
    const selectAllParticipantsChip = bossGroupDiv.querySelector('.select-all-participants');
    const selectAllCheckbox = bossGroupDiv.querySelector('.select-all-checkbox');
    const participantsCheckboxContainer = bossGroupDiv.querySelector('.participants-checkbox-container');
    const distributionMethodRadios = bossGroupDiv.querySelectorAll(`.distribution-method[name="distribution-method-${bossGroupId}"]`);
    const customShareContainer = bossGroupDiv.querySelector('.custom-share-container');
    const itemListContainer = bossGroupDiv.querySelector('.item-list');
    const hideUnsetToggle = bossGroupDiv.querySelector('.hide-unset-toggle');

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

    if (hideUnsetToggle) {
        hideUnsetToggle.addEventListener('change', function() {
            updateAllocationsData();
            applyHideUnset(bossGroupDiv);
        });
    }

    // 初始化時將數據存入 allocations
    updateAllocationsData();

    // 全選/取消全選（chip 樣式）
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            const allCheckboxes = participantsCheckboxContainer.querySelectorAll('.participant-checkbox');
            const target = this.checked;
            allCheckboxes.forEach(checkbox => {
                checkbox.checked = target;
                const label = checkbox.closest('.participant-chip');
                if (label) label.classList.toggle('checked', target);
            });
            const selectedParticipants = Array.from(participantsCheckboxContainer.querySelectorAll('.participant-checkbox:checked')).map(cb => cb.value);
            updateCustomShareFields(bossGroupDiv, selectedParticipants, allocations[bossGroupId]?.allocations || {});
            populateOwnerSelects(bossGroupDiv, selectedParticipants);
            updateAllocationsData();
        });
    }
}

// 函數：渲染 BOSS 掉落道具列表
function renderBossItems(bossGroupDiv, bossName, selectedItems = []) {
    const itemListContainer = bossGroupDiv.querySelector('.item-list');
    itemListContainer.innerHTML = '';
    const itemsForBoss = bossItemsData.filter(item => item.boss_name === bossName);

    const selectedParticipants = Array.from(bossGroupDiv.querySelectorAll('.participant-checkbox:checked')).map(cb => cb.value);

    itemsForBoss.forEach(item => {
        const saved = selectedItems.find(selected => selected.name === item.item_name) || {};
        const isChecked = true; // 不再使用勾選，改以持有者+有效值判定
        const nesoAmount = saved.nesoAmount ?? 0;
        const price = saved.price ?? '';
        const owner = saved.owner ?? '';
        const itemCard = generateItemCard(bossName, item, isChecked, nesoAmount, price, owner);
        itemListContainer.appendChild(itemCard);

        const nesoAmountInput = itemCard.querySelector('.neso-amount-input');
        if (nesoAmountInput) {
            nesoAmountInput.addEventListener('input', function() {
                updateAllocationsData();
            });
        }

        const priceInput = itemCard.querySelector('.item-price-input');
        if (priceInput) {
            priceInput.addEventListener('input', function() {
                updateAllocationsData();
            });
        }

        const ownerSelect = itemCard.querySelector('.item-owner-select');
        if (ownerSelect) {
            // 先填入參與者選項
            fillOwnerOptions(ownerSelect, selectedParticipants);
            // 設定預設選擇
            const def = ownerSelect.getAttribute('data-default-owner');
            if (def && selectedParticipants.includes(def)) {
                ownerSelect.value = def;
            }
            ownerSelect.addEventListener('change', function() {
                updateAllocationsData();
            });
        }
    });

    // 附加 NESO 1/2/3 卡片（預設 0）
    const nesoImg = 'https://msu.io/marketplace/images/neso.png';
    ['NESO 1', 'NESO 2', 'NESO 3'].forEach((label, idx) => {
    const saved = selectedItems.find(si => (si.name || '').toLowerCase() === label.toLowerCase()) || {};
    const amountDefault = saved.nesoAmount ?? 0;
        const owner = saved.owner ?? '';
        const item = { boss_name: bossName, item_name: label, image_url: nesoImg };
        const card = generateItemCard(bossName, item, true, amountDefault, '', owner);
        itemListContainer.appendChild(card);
        const ownerSelect = card.querySelector('.item-owner-select');
        if (ownerSelect) {
            fillOwnerOptions(ownerSelect, selectedParticipants);
            const def = ownerSelect.getAttribute('data-default-owner');
            if (def && selectedParticipants.includes(def)) ownerSelect.value = def;
            ownerSelect.addEventListener('change', updateAllocationsData);
        }
        const nesoAmountInput = card.querySelector('.neso-amount-input');
        if (nesoAmountInput) nesoAmountInput.addEventListener('input', updateAllocationsData);
    });
    // 套用隱藏規則
    applyHideUnset(bossGroupDiv);
}

function fillOwnerOptions(selectEl, participants) {
    selectEl.innerHTML = '<option value="">選擇持有者</option>';
    participants.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p;
        opt.textContent = p;
        selectEl.appendChild(opt);
    });
}

function populateOwnerSelects(bossGroupDiv, participants) {
    const selects = bossGroupDiv.querySelectorAll('.item-owner-select');
    selects.forEach(sel => {
        const prev = sel.value || sel.getAttribute('data-default-owner') || '';
        fillOwnerOptions(sel, participants);
        if (prev && participants.includes(prev)) {
            sel.value = prev;
        } else {
            sel.value = '';
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
    const hideUnset = !!bossGroupDiv.querySelector('.hide-unset-toggle')?.checked;

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

        // 改為：有持有者且數值有效，即視為選取
        const selectedItems = Array.from(bossGroupDiv.querySelectorAll('.item-card'))
            .map(card => {
                const itemName = card.dataset.itemName || (card.querySelector('p')?.textContent || '').trim();
                const isNeso = (itemName || '').toLowerCase().includes('neso');
                const ownerSel = card.querySelector('.item-owner-select');
                const owner = ownerSel ? ownerSel.value : '';
                if (isNeso) {
                    const nesoAmountInput = card.querySelector('.neso-amount-input');
                    return { name: itemName, isNeso: true, nesoAmount: parseFloat(nesoAmountInput?.value) || 0, owner };
                } else {
                    const priceInput = card.querySelector('.item-price-input');
                    const price = parseFloat(priceInput?.value);
                    return { name: itemName, isNeso: false, price: isNaN(price) ? null : price, owner };
                }
            })
            .filter(it => {
                if (!it.owner) return false;
                if (it.isNeso) return (it.nesoAmount || 0) > 0;
                return it.price !== null && it.price > 0;
            });

        allocations[bossGroupId] = {
            bossName,
            participants,
            distributionMethod,
            allocations: currentAllocations,
            fee,
            selectedItems,
            hideUnset
        };
    });
    generateShareLink();
    renderNesoSummary();
    // 更新後依據隱藏規則重新套用一次（所有 BOSS 區塊）
    document.querySelectorAll('.boss-group').forEach(group => applyHideUnset(group));
}

// 根據「持有者+有效數值」來隱藏未設定道具
function applyHideUnset(bossGroupDiv) {
    const hide = !!bossGroupDiv.querySelector('.hide-unset-toggle')?.checked;
    const cards = bossGroupDiv.querySelectorAll('.item-card');
    cards.forEach(card => {
        if (!hide) {
            card.classList.remove('hidden');
            return;
        }
        const itemName = card.dataset.itemName || (card.querySelector('p')?.textContent || '').trim();
        const isNeso = (itemName || '').toLowerCase().includes('neso');
        const owner = card.querySelector('.item-owner-select')?.value || '';
        if (!owner) {
            card.classList.add('hidden');
            return;
        }
        if (isNeso) {
            const amt = parseFloat(card.querySelector('.neso-amount-input')?.value || '0') || 0;
            card.classList.toggle('hidden', !(amt > 0));
        } else {
            const price = parseFloat(card.querySelector('.item-price-input')?.value || '');
            card.classList.toggle('hidden', !(price > 0));
        }
    });
}

// 函數：計算分帳結果（根據售價/手續費/NESO 與持有者，產生轉帳建議）
function calculateDistribution() {
    updateAllocationsData();
    resultTableBody.innerHTML = '';

    // 全域餘額：>0 代表多收（需轉出），<0 代表少收（需收款）
    const balances = {};
    const nameSet = new Set(globalMembers.map(m => m.name).filter(Boolean));

    let anyData = false;
    let warnings = [];

    for (const bossGroupId in allocations) {
        const bossData = allocations[bossGroupId];
        if (!bossData || !Array.isArray(bossData.participants) || bossData.participants.length === 0) continue;

        // 初始化參與者名稱集合
        bossData.participants.forEach(p => nameSet.add(p));

        // 計算淨收入（扣手續費；NESO 不扣）
        let netTotal = 0;
        const feeRate = bossData.fee || 0; // 0.05 之類

        // 參與者已收金額（來自其所持有之道具）
        const received = {};
        bossData.participants.forEach(p => received[p] = 0);

        (bossData.selectedItems || []).forEach(item => {
            const owner = item.owner || '';
            if (item.isNeso) {
                const val = Number(item.nesoAmount || 0);
                netTotal += val;
                if (owner) {
                    received[owner] = (received[owner] || 0) + val;
                } else if (val > 0) {
                    warnings.push(`「${bossData.bossName || '未選擇 BOSS'}」的 NESO 項目缺少持有者，金額 ${val}`);
                }
            } else {
                const price = Number(item.price);
                if (isNaN(price) || price <= 0) {
                    return; // 價格無效則忽略該項
                }
                const net = price * (1 - feeRate);
                netTotal += net;
                if (owner) {
                    received[owner] = (received[owner] || 0) + net;
                } else {
                    warnings.push(`「${bossData.bossName || '未選擇 BOSS'}」的道具「${item.name}」缺少持有者`);
                }
            }
        });

        if (netTotal === 0) continue;
        anyData = true;

        // 計算應得份額
        const expected = {};
        if (bossData.distributionMethod === 'average' || !bossData.allocations || Object.keys(bossData.allocations).length === 0) {
            const per = netTotal / bossData.participants.length;
            bossData.participants.forEach(p => expected[p] = per);
        } else {
            let sumShare = 0;
            bossData.participants.forEach(p => sumShare += (bossData.allocations[p] || 0));
            if (sumShare <= 0) {
                // fallback 平均
                const per = netTotal / bossData.participants.length;
                bossData.participants.forEach(p => expected[p] = per);
            } else {
                bossData.participants.forEach(p => {
                    expected[p] = netTotal * (bossData.allocations[p] || 0);
                });
            }
        }

        // 更新餘額：已收 - 應得
        bossData.participants.forEach(p => {
            const delta = (received[p] || 0) - (expected[p] || 0);
            balances[p] = (balances[p] || 0) + delta;
        });
    }

    // 對未參與任何 boss 但在全域名單中的人補 0
    nameSet.forEach(n => { if (!(n in balances)) balances[n] = 0; });

    // 產生轉帳建議
    const payers = [];
    const receivers = [];
    for (const name in balances) {
        const amt = Number(balances[name] || 0);
        if (Math.abs(amt) < 1e-9) continue;
        if (amt > 0) payers.push({ name, amount: amt });
        else receivers.push({ name, amount: -amt });
    }

    if (!anyData || (payers.length === 0 && receivers.length === 0)) {
        const row = resultTableBody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 3;
        cell.textContent = '沒有可計算的分配結果（可能未輸入售價或 NESO 數量）。';
        cell.style.textAlign = 'center';
        if (warnings.length) showToast(warnings[0], 'error');
        return;
    }

    payers.sort((a, b) => b.amount - a.amount);
    receivers.sort((a, b) => b.amount - a.amount);

    const transfers = [];
    let i = 0, j = 0;
    while (i < payers.length && j < receivers.length) {
        const pay = payers[i];
        const rec = receivers[j];
        const t = Math.min(pay.amount, rec.amount);
        if (t > 0) transfers.push({ from: pay.name, to: rec.name, amount: t });
        pay.amount -= t;
        rec.amount -= t;
        if (pay.amount <= 1e-9) i++;
        if (rec.amount <= 1e-9) j++;
    }

    // 繪製結果表頭
    const table = document.getElementById('result-table');
    table.querySelector('thead').innerHTML = `
        <tr>
            <th>支付方</th>
            <th>接收方</th>
            <th>金額</th>
        </tr>
    `;

    if (transfers.length === 0) {
        const row = resultTableBody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 3;
        cell.textContent = '所有人份額相等，無需轉帳。';
        cell.style.textAlign = 'center';
    } else {
        transfers.forEach(tx => {
            const row = resultTableBody.insertRow();
            row.insertCell().textContent = tx.from;
            row.insertCell().textContent = tx.to;
            row.insertCell().textContent = tx.amount.toFixed(2);
        });
    }

    if (warnings.length) showToast(warnings[0], 'error');

    // 計算後也同步 NESO 總結（保險）
    renderNesoSummary();
}

// NESO 總計與每人 NESO 統計
function renderNesoSummary() {
    const totalEl = document.getElementById('total-neso');
    const tableBody = document.querySelector('#neso-summary-table tbody');
    if (!totalEl || !tableBody) return;

    const perPerson = {};
    let grand = 0;

    // 聚合 allocations 中的 NESO
    for (const id in allocations) {
        const bossData = allocations[id];
        if (!bossData || !Array.isArray(bossData.selectedItems)) continue;
        bossData.selectedItems.forEach(item => {
            if (!item.isNeso) return;
            const amt = Number(item.nesoAmount || 0);
            if (amt <= 0) return;
            grand += amt;
            const owner = item.owner || '';
            if (owner) perPerson[owner] = (perPerson[owner] || 0) + amt;
        });
    }

    totalEl.textContent = `所有 BOSS NESO 總計：${grand}`;
    tableBody.innerHTML = '';
    const names = Object.keys(perPerson).sort((a,b) => perPerson[b]-perPerson[a]);
    if (names.length === 0) {
        const row = tableBody.insertRow();
        const c = row.insertCell();
        c.colSpan = 2;
        c.textContent = '尚無 NESO 分配資料';
        c.style.textAlign = 'center';
        return;
    }
    names.forEach(name => {
        const row = tableBody.insertRow();
        row.insertCell().textContent = name;
        row.insertCell().textContent = perPerson[name];
    });
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
