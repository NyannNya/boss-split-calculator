const data = {
    members: [],
    sales: [],
    distribution: {
        method: "average",
        fee: 0.05
    }
};

// DOM 元素
const numMembersInput = document.getElementById('num-members');
const generateMembersButton = document.getElementById('generate-members');
const membersContainer = document.getElementById('members-container');
const addSaleItemButton = document.getElementById('add-sale-item');
const salesContainer = document.getElementById('sales-container');
const averageDistributionRadio = document.getElementById('average-distribution');
const customDistributionRadio = document.getElementById('custom-distribution');
const customShareContainer = document.getElementById('custom-share-container');
const feeInput = document.getElementById('fee');
const calculateButton = document.getElementById('calculate-button');
const resultTableBody = document.querySelector('#result-table tbody');
const resultTextarea = document.getElementById('result-text');
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
                <input type="number" class="member-share" data-index="${index}" min="0" value="${member.share * 100}">
            `;
            customShareContainer.appendChild(shareGroup);
        });
    }
}

// 函數：新增銷售項目
function addSaleItem() {
    const saleItemDiv = document.createElement('div');
    saleItemDiv.classList.add('sale-item');
    saleItemDiv.innerHTML = `
        <div class="form-group">
            <label>王的名稱:</label>
            <input type="text" class="boss-name">
        </div>
        <div class="form-group">
            <label>打到的東西:</label>
            <input type="text" class="item-name">
        </div>
        <div class="form-group">
            <label>銷售價格:</label>
            <input type="number" class="item-price" min="0" value="0">
        </div>
        <div class="form-group">
            <label>NESO:</label>
            <input type="number" class="neso-price" min="0" value="0">
        </div>
        <button class="remove-sale-item">移除</button>
    `;
    salesContainer.appendChild(saleItemDiv);

    // 為新的移除按鈕添加事件監聽器
    saleItemDiv.querySelector('.remove-sale-item').addEventListener('click', function() {
        saleItemDiv.remove();
        updateDataFromInputs(); // 移除後更新數據
    });
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
    document.querySelectorAll('#sales-container .sale-item').forEach(item => {
        const bossName = item.querySelector('.boss-name').value;
        const itemName = item.querySelector('.item-name').value;
        const itemPrice = parseFloat(item.querySelector('.item-price').value) || 0;
        const nesoPrice = parseFloat(item.querySelector('.neso-price').value) || 0;
        data.sales.push({ bossName, item: itemName, price: itemPrice, neso: nesoPrice });
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
}

// 函數：計算分帳結果
function calculateDistribution() {
    updateDataFromInputs(); // 確保數據是最新的

    let totalRevenue = 0;
    data.sales.forEach(sale => {
        totalRevenue += sale.price + sale.neso;
    });

    const netRevenue = totalRevenue * (1 - data.distribution.fee);

    let distributedAmounts = {};

    if (data.distribution.method === 'average') {
        const numMembers = data.members.length;
        if (numMembers > 0) {
            const amountPerMember = netRevenue / numMembers;
            data.members.forEach(member => {
                distributedAmounts[member.name] = amountPerMember;
            });
        }
    } else if (data.distribution.method === 'custom') {
        let totalCustomShare = 0;
        data.members.forEach(member => totalCustomShare += member.share);

        if (totalCustomShare > 0) {
            data.members.forEach(member => {
                distributedAmounts[member.name] = netRevenue * (member.share / totalCustomShare);
            });
        } else {
            // 如果自訂分配比總和為 0，則平均分配
            const numMembers = data.members.length;
            if (numMembers > 0) {
                const amountPerMember = netRevenue / numMembers;
                data.members.forEach(member => {
                    distributedAmounts[member.name] = amountPerMember;
                });
            }
        }
    }

    // 顯示結果
    resultTableBody.innerHTML = '';
    let resultText = "分帳結果:\n";
    data.members.forEach(member => {
        const amount = distributedAmounts[member.name] || 0;
        const row = resultTableBody.insertRow();
        row.insertCell().textContent = member.name;
        row.insertCell().textContent = amount.toFixed(2);
        row.insertCell().textContent = member.address;
        resultText += `${member.name}: ${amount.toFixed(2)} ${member.address ? `(${member.address})` : ''}\n`;
    });

    resultText += "\n原始數據 (JSON 格式):\n" + JSON.stringify(data, null, 2);
    resultTextarea.value = resultText;

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
            Object.assign(data, decodedData); // 將解碼後的數據合併到 data 物件

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
            salesContainer.innerHTML = ''; // 清空現有銷售項目
            data.sales.forEach(sale => {
                addSaleItem(); // 添加新的銷售項目欄位
                const lastSaleItem = salesContainer.lastElementChild;
                if (lastSaleItem) {
                    lastSaleItem.querySelector('.boss-name').value = sale.bossName || '';
                    lastSaleItem.querySelector('.item-name').value = sale.item;
                    lastSaleItem.querySelector('.item-price').value = sale.price;
                    lastSaleItem.querySelector('.neso-price').value = sale.neso || 0;
                }
            });
            // 如果沒有銷售項目，則添加一個空的
            if (data.sales.length === 0) {
                addSaleItem();
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
            addSaleItem();
        }
    } else {
        // 如果沒有 data 參數，則初始化為預設值
        generateMemberFields();
        addSaleItem();
    }
}

// 事件監聽器
generateMembersButton.addEventListener('click', generateMemberFields);
addSaleItemButton.addEventListener('click', addSaleItem);
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

// 複製結果按鈕
copyResultButton.addEventListener('click', () => {
    resultTextarea.select();
    document.execCommand('copy');
    alert('結果已複製到剪貼簿！');
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
salesContainer.addEventListener('input', updateDataFromInputs);
feeInput.addEventListener('input', updateDataFromInputs);
customShareContainer.addEventListener('input', updateDataFromInputs);