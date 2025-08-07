const data = {
    members: [],
    sales: [], // 銷售項目，每個項目包含 bossName, item, owner, price, applyFee
    distribution: {
        method: "average",
        fee: 0.05
    },
    // 新增一個屬性來追蹤每個 BOSS 區塊的 ID，以便在加載時正確匹配
    bossGroupCounter: 0
};

// DOM 元素
const numMembersInput = document.getElementById('num-members');
const generateMembersButton = document.getElementById('generate-members');
const membersContainer = document.getElementById('members-container');
const addBossGroupButton = document.getElementById('add-boss-group');
const bossSalesContainer = document.getElementById('boss-sales-container');
const averageDistributionRadio = document.getElementById('average-distribution');
const customDistributionRadio = document.getElementById('custom-distribution');
const customShareContainer = document.getElementById('custom-share-container');
const feeInput = document.getElementById('fee');
const calculateButton = document.getElementById('calculate-button');
const resultTableBody = document.querySelector('#result-table tbody');
const shareLinkTextarea = document.getElementById('share-link');
const copyResultButton = document.getElementById('copy-result');
const copyShareLinkButton = document.getElementById('copy-share-link');

// 函數：生成成員輸入欄位
function generateMemberFields() {
    const numMembers = parseInt(numMembersInput.value);
    membersContainer.innerHTML = '';
    data.members = [];
    for (let i = 0; i < numMembers; i++) {
        const memberItem = document.createElement('div');
        memberItem.classList.add('member-item');
        memberItem.innerHTML = `
            <div class="form-group">
                <label>成員名稱:</label>
                <input type="text" class="member-name" value="成員${i + 1}">
            </div>
            <div class="form-group">
                <label>錢包地址:</label>
                <input type="text" class="member-address">
            </div>
        `;
        membersContainer.appendChild(memberItem);
        data.members.push({ name: `成員${i + 1}`, address: '', share: 0 });
    }
    updateCustomShareFields();
    updateMemberOwnerSelects(); // 新增：更新所有道具獲得者下拉選單
}

// 函數：更新自訂分配比欄位
function updateCustomShareFields() {
    customShareContainer.innerHTML = '';
    if (customDistributionRadio.checked) {
        data.members.forEach((member, index) => {
            const shareGroup = document.createElement('div');
            shareGroup.classList.add('form-group');
            shareGroup.innerHTML = `
                <label>${member.name} 分配比 (%):</label>
                <input type="number" class="member-share" data-index="${index}" min="0" value="${(member.share * 100).toFixed(2)}">
            `;
            customShareContainer.appendChild(shareGroup);
        });
    }
}

// 函數：生成成員下拉選單選項
function generateMemberOptions() {
    let options = '<option value="">請選擇</option>';
    data.members.forEach(member => {
        options += `<option value="${member.name}">${member.name}</option>`;
    });
    return options;
}

// 函數：更新所有道具獲得者下拉選單
function updateMemberOwnerSelects() {
    document.querySelectorAll('.item-owner').forEach(select => {
        const currentOwner = select.value;
        select.innerHTML = generateMemberOptions();
        select.value = currentOwner; // 嘗試恢復選定的值
    });
}

// 函數：新增銷售項目到指定的 BOSS 區塊
function addSaleItemToBoss(salesItemsContainer, itemData = {}) {
    const saleItemDiv = document.createElement('div');
    saleItemDiv.classList.add('sale-item');
    const itemId = `apply-fee-${Date.now()}-${Math.floor(Math.random() * 1000)}`; // 確保 ID 唯一
    saleItemDiv.innerHTML = `
        <div class="form-group">
            <label>道具名稱:</label>
            <input type="text" class="item-name" value="${itemData.item || ''}">
        </div>
        <div class="form-group">
            <label>道具獲得者:</label>
            <select class="item-owner">
                ${generateMemberOptions()}
            </select>
        </div>
        <div class="form-group">
            <label>售價:</label>
            <input type="number" class="item-price" min="0" value="${itemData.price || 0}">
        </div>
        <div class="form-group checkbox-group">
            <input type="checkbox" class="apply-fee" id="${itemId}" ${itemData.applyFee === false ? '' : 'checked'}>
            <label for="${itemId}">扣手續費</label>
        </div>
        <button class="remove-sale-item">移除</button>
    `;
    salesItemsContainer.appendChild(saleItemDiv);

    // 設定道具獲得者
    if (itemData.owner) {
        saleItemDiv.querySelector('.item-owner').value = itemData.owner;
    }

    saleItemDiv.querySelector('.remove-sale-item').addEventListener('click', function() {
        saleItemDiv.remove();
        updateDataFromInputs();
    });
}

// 函數：新增 BOSS 區塊
function addBossGroup(bossData = {}) {
    const bossGroupDiv = document.createElement('div');
    bossGroupDiv.classList.add('boss-group');
    const currentBossId = data.bossGroupCounter++; // 為每個 BOSS 區塊分配一個唯一 ID
    bossGroupDiv.dataset.bossId = currentBossId; // 將 ID 存儲在 data 屬性中

    bossGroupDiv.innerHTML = `
        <div class="form-group boss-name-row">
            <label>王的名稱:</label>
            <input type="text" class="boss-name-group" value="${bossData.bossName || `BOSS ${currentBossId + 1}`}">
            <button class="remove-boss-group">移除此BOSS</button>
        </div>
        <div class="sales-items-container">
            <!-- 銷售項目將在此處動態生成 -->
        </div>
        <button class="add-sale-item-to-boss">新增銷售項目</button>
    `;
    bossSalesContainer.appendChild(bossGroupDiv);

    const salesItemsContainer = bossGroupDiv.querySelector('.sales-items-container');

    // 如果是從 URL 加載數據，則填充銷售項目
    if (bossData.items && bossData.items.length > 0) {
        bossData.items.forEach(item => {
            addSaleItemToBoss(salesItemsContainer, item);
        });
    } else {
        addSaleItemToBoss(salesItemsContainer); // 為新的 BOSS 區塊添加一個預設銷售項目
    }

    bossGroupDiv.querySelector('.remove-boss-group').addEventListener('click', function() {
        bossGroupDiv.remove();
        updateDataFromInputs();
    });

    bossGroupDiv.querySelector('.add-sale-item-to-boss').addEventListener('click', function() {
        addSaleItemToBoss(salesItemsContainer);
        updateDataFromInputs();
    });
}

// 函數：格式化數字為千分位
function formatNumber(num) {
    return num.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// 函數：從輸入欄位讀取數據並更新 data 物件
function updateDataFromInputs() {
    // 更新成員資訊
    data.members = [];
    document.querySelectorAll('#members-container .member-item').forEach(item => {
        const name = item.querySelector('.member-name').value;
        const address = item.querySelector('.member-address').value;
        data.members.push({ name, address, share: 0 }); // share 暫時設為 0，後面會更新
    });

    // 更新銷售資訊
    data.sales = [];
    document.querySelectorAll('#boss-sales-container .boss-group').forEach(bossGroup => {
        const bossName = bossGroup.querySelector('.boss-name-group').value;
        bossGroup.querySelectorAll('.sale-item').forEach(item => {
            const itemName = item.querySelector('.item-name').value;
            const itemOwner = item.querySelector('.item-owner').value;
            const itemPrice = parseFloat(item.querySelector('.item-price').value) || 0;
            const applyFee = item.querySelector('.apply-fee').checked;
            data.sales.push({ bossName, item: itemName, owner: itemOwner, price: itemPrice, applyFee: applyFee });
        });
    });

    // 更新分帳設定
    data.distribution.method = document.querySelector('input[name="distribution-method"]:checked').value;
    data.distribution.fee = parseFloat(feeInput.value) / 100 || 0;

    // 更新自訂分配比
    if (data.distribution.method === 'custom') {
        let totalCustomShare = 0;
        document.querySelectorAll('#custom-share-container .member-share').forEach(input => {
            const index = parseInt(input.dataset.index);
            const share = parseFloat(input.value) / 100 || 0;
            if (data.members[index]) {
                data.members[index].share = share;
                totalCustomShare += share;
            }
        });
        // 如果自訂分配比總和不為 1 (100%)，可以給出警告或自動調整
        if (totalCustomShare > 0 && totalCustomShare !== 1) {
            console.warn("自訂分配比總和不為 100%，將按比例調整。");
            data.members.forEach(member => {
                if (totalCustomShare > 0) {
                    member.share /= totalCustomShare;
                }
            });
        }
    } else {
        // 平均分配時，重置 share
        data.members.forEach(member => member.share = 0);
    }

    // 更新道具獲得者下拉選單
    updateMemberOwnerSelects();
}

// 函數：計算分帳結果
function calculateDistribution() {
    updateDataFromInputs(); // 確保數據是最新的

    let totalRevenue = 0;
    let ownerRevenues = {}; // 記錄每個道具獲得者的收入

    data.members.forEach(member => {
        ownerRevenues[member.name] = 0;
    });

    data.sales.forEach(sale => {
        let itemNetPrice = sale.price;
        if (sale.applyFee) {
            itemNetPrice *= (1 - data.distribution.fee);
        }
        totalRevenue += itemNetPrice;

        // 將道具收入歸屬到獲得者
        if (sale.owner && ownerRevenues[sale.owner] !== undefined) {
            ownerRevenues[sale.owner] += itemNetPrice;
        }
    });

    let distributedAmounts = {};
    let totalDistributed = 0;

    if (data.distribution.method === 'average') {
        const numMembers = data.members.length;
        if (numMembers > 0) {
            const amountPerMember = totalRevenue / numMembers;
            data.members.forEach(member => {
                distributedAmounts[member.name] = amountPerMember;
                totalDistributed += amountPerMember;
            });
        }
    } else if (data.distribution.method === 'custom') {
        let totalCustomShare = 0;
        data.members.forEach(member => totalCustomShare += member.share);

        if (totalCustomShare > 0) {
            data.members.forEach(member => {
                distributedAmounts[member.name] = totalRevenue * (member.share / totalCustomShare);
                totalDistributed += distributedAmounts[member.name];
            });
        } else {
            // 如果自訂分配比總和為 0，則平均分配
            const numMembers = data.members.length;
            if (numMembers > 0) {
                const amountPerMember = totalRevenue / numMembers;
                data.members.forEach(member => {
                    distributedAmounts[member.name] = amountPerMember;
                    totalDistributed += amountPerMember;
                });
            }
        }
    }

    // 處理收到錢的人給應該收錢的人的邏輯
    let finalAmounts = {};
    data.members.forEach(member => {
        finalAmounts[member.name] = (distributedAmounts[member.name] || 0) - (ownerRevenues[member.name] || 0);
    });

    // 顯示結果
    resultTableBody.innerHTML = '';
    data.members.forEach(member => {
        const amount = finalAmounts[member.name] || 0;
        const row = resultTableBody.insertRow();
        row.insertCell().textContent = member.name;
        row.insertCell().textContent = formatNumber(amount); // 格式化金額
        row.insertCell().textContent = member.address;
    });

    generateShareLink();
}

// 函數：生成分享連結
function generateShareLink() {
    const encodedData = btoa(JSON.stringify(data));
    const shareUrl = `${window.location.origin}${window.location.pathname}?data=${encodedData}`;
    shareLinkTextarea.value = shareUrl;
}

// 函數：從 URL 載入數據
function loadDataFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const encodedData = urlParams.get('data');
    if (encodedData) {
        try {
            const decodedData = JSON.parse(atob(encodedData));
            // 合併數據，但保留 bossGroupCounter
            const originalBossGroupCounter = data.bossGroupCounter;
            Object.assign(data, decodedData);
            data.bossGroupCounter = originalBossGroupCounter; // 恢復計數器

            // 填充成員資訊
            numMembersInput.value = data.members.length;
            generateMemberFields(); // 先生成空欄位
            data.members.forEach((member, index) => {
                const memberItem = membersContainer.children[index];
                if (memberItem) {
                    memberItem.querySelector('.member-name').value = member.name;
                    memberItem.querySelector('.member-address').value = member.address;
                }
            });

            // 填充銷售資訊
            bossSalesContainer.innerHTML = ''; // 清空現有 BOSS 區塊
            // 重新組織 sales 數據，按 bossName 分組
            const salesByBoss = data.sales.reduce((acc, sale) => {
                if (!acc[sale.bossName]) {
                    acc[sale.bossName] = [];
                }
                acc[sale.bossName].push(sale);
                return acc;
            }, {});

            Object.keys(salesByBoss).forEach(bossName => {
                addBossGroup({ bossName: bossName, items: salesByBoss[bossName] });
            });

            // 如果沒有銷售項目，則添加一個空的 BOSS 區塊
            if (data.sales.length === 0) {
                addBossGroup();
            }


            // 填充分帳設定
            if (data.distribution.method === 'average') {
                averageDistributionRadio.checked = true;
                customShareContainer.style.display = 'none';
            } else {
                customDistributionRadio.checked = true;
                customShareContainer.style.display = 'block';
                updateCustomShareFields(); // 更新自訂分配比欄位
                data.members.forEach((member, index) => {
                    const customShareInput = customShareContainer.querySelector(`.member-share[data-index="${index}"]`);
                    if (customShareInput) {
                        customShareInput.value = (member.share * 100).toFixed(2);
                    }
                });
            }
            feeInput.value = (data.distribution.fee * 100).toFixed(2);

            calculateDistribution(); // 自動計算結果
        } catch (e) {
            console.error("解析 URL 數據失敗:", e);
            // 如果解析失敗，則初始化為預設值
            generateMemberFields();
            addBossGroup();
        }
    } else {
        // 如果沒有 data 參數，則初始化為預設值
        generateMemberFields();
        addBossGroup();
    }
}

// 事件監聽器
generateMembersButton.addEventListener('click', generateMemberFields);
addBossGroupButton.addEventListener('click', addBossGroup);
calculateButton.addEventListener('click', calculateDistribution);

averageDistributionRadio.addEventListener('change', () => {
    customShareContainer.style.display = 'none';
    updateDataFromInputs();
});
customDistributionRadio.addEventListener('change', () => {
    customShareContainer.style.display = 'block';
    updateCustomShareFields();
    updateDataFromInputs();
});

// 複製分帳結果按鈕
copyResultButton.addEventListener('click', () => {
    let resultText = "分帳結果:\n";
    document.querySelectorAll('#result-table tbody tr').forEach(row => {
        const name = row.cells[0].textContent;
        const amount = row.cells[1].textContent;
        const address = row.cells[2].textContent;
        resultText += `${name}: ${amount} ${address ? `(${address})` : ''}\n`;
    });
    navigator.clipboard.writeText(resultText).then(() => {
        alert('分帳結果已複製到剪貼簿！');
    }).catch(err => {
        console.error('複製失敗:', err);
    });
});

// 複製分享連結按鈕
copyShareLinkButton.addEventListener('click', () => {
    shareLinkTextarea.select();
    document.execCommand('copy');
    alert('分享連結已複製到剪貼簿！');
});

// 初始化：網頁載入時檢查 URL 數據
window.addEventListener('load', loadDataFromUrl);

// 確保在成員名稱或錢包地址改變時更新 data 物件
membersContainer.addEventListener('input', updateDataFromInputs);
bossSalesContainer.addEventListener('input', updateDataFromInputs); // 修改為 bossSalesContainer
feeInput.addEventListener('input', updateDataFromInputs);
customShareContainer.addEventListener('input', updateDataFromInputs);