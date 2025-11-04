// --- 状態管理変数 ---
let coins = 0;
let reels = [null, null, null]; // 現在のリール位置 (停止後の図柄ID)
let isSpinning = [false, false, false];
let isStarted = false; // レバーが押されたか
let isBonus = false; // ボーナスフラグ（GOGOランプ）

// --- 定数 ---
const SYMBOLS = ['7', 'BAR', '🍒', '🔔', '🍇', 'BLANK'];
const PAYOUTS = {
    '7,7,7': 100,
    'BAR,BAR,BAR': 50,
    '🍒': 3, // チェリーは単体で当選
    '🔔,🔔,🔔': 10,
    '🍇,🍇,🍇': 5,
};
const PRIZES = [
    { id: 1, name: '巨大GOGO!ステッカー', cost: 100, collected: false },
    { id: 2, name: 'オリジナルTシャツ', cost: 500, collected: false },
    { id: 3, name: 'プレミアムフィギュア', cost: 1500, collected: false },
];

// --- DOM要素 (グローバル変数として定義するが、初期化はDOMContentLoaded内で行う) ---
let coinCountEl;
let leverBtn;
let insertBtn;
let stopBtns;
let messageEl;
let gogoLampEl;
let reelContainers;
let confirmPurchaseBtn;
let purchaseMessageEl;
let prizesListEl;
let collectionListEl;

// --- コイン購入機能用変数 ---
let currentPurchaseAmount = 0;

/**
 * ページ上のすべての要素がロードされた後に実行される関数
 * ❗️❗️❗️ 最重要 ❗️❗️❗️：すべての要素取得とイベント設定はここで行う
 */
document.addEventListener('DOMContentLoaded', () => {
    // DOM要素の取得
    coinCountEl = document.getElementById('coin-count');
    leverBtn = document.getElementById('lever-btn');
    insertBtn = document.getElementById('insert-btn');
    stopBtns = document.querySelectorAll('.stop-btn');
    messageEl = document.getElementById('message');
    gogoLampEl = document.getElementById('gogo-lamp');
    reelContainers = [
        document.getElementById('reel-0'),
        document.getElementById('reel-1'),
        document.getElementById('reel-2')
    ];
    confirmPurchaseBtn = document.getElementById('confirm-purchase-btn');
    purchaseMessageEl = document.getElementById('purchase-message');
    prizesListEl = document.getElementById('prizes-list');
    collectionListEl = document.getElementById('collection-list');

    // イベントリスナーの設定
    insertBtn.addEventListener('click', handleInsert);
    leverBtn.addEventListener('click', handleLever);
    stopBtns.forEach(btn => btn.addEventListener('click', handleStop));
    confirmPurchaseBtn.addEventListener('click', handleConfirmPurchase);

    // ゲームの初期化
    initializeGame();
});

// --- 初期化とデータ読み込み ---

/**
 * localStorageからデータを読み込み、UIを更新する
 */
function initializeGame() {
    // コインを読み込み
    coins = parseInt(localStorage.getItem('slot_coins') || 0);
    
    // 景品データを読み込み
    const savedPrizes = JSON.parse(localStorage.getItem('slot_prizes'));
    if (savedPrizes) {
        PRIZES.forEach(p => {
            const saved = savedPrizes.find(sp => sp.id === p.id);
            if (saved) p.collected = saved.collected;
        });
    }

    updateUI();
    renderPrizes();
    messageEl.textContent = '「インサート」を押して開始！';
}

/**
 * UIの更新
 */
function updateUI() {
    coinCountEl.textContent = coins;
    localStorage.setItem('slot_coins', coins);

    // インサートボタンの活性/非活性
    insertBtn.disabled = isStarted || coins < 3;
    leverBtn.disabled = !isStarted;
}

/**
 * リールの図柄をランダムにセット
 */
function setReelSymbol(index, symbol) {
    if (reelContainers && reelContainers[index]) {
        reelContainers[index].textContent = symbol;
    }
}

// --- ゲームロジック ---

/**
 * 1. インサートボタン処理
 */
function handleInsert() {
    if (isStarted) return;
    if (coins >= 3) {
        coins -= 3;
        isStarted = true; // 投入済み状態
        gogoLampEl.classList.remove('on'); // ランプを消す
        messageEl.textContent = 'レバーを押してください。';
    } else {
        messageEl.textContent = 'コインが不足しています。購入してください。';
    }
    updateUI();
}

/**
 * 2. レバーボタン（スタート）処理
 */
function handleLever() {
    if (!isStarted || isSpinning.some(s => s)) return;
    
    // 実際に当選させるかどうかの判定 (5%の確率でボーナス成立としてシミュレート)
    isBonus = Math.random() < 0.05;
    if (isBonus) {
        // ボーナス成立の場合、第一リール停止後にGOGO!ランプを点灯させる
        setTimeout(() => {
            if (!isSpinning[0]) gogoLampEl.classList.add('on');
        }, 1500); // 1.5秒後に点灯
    }
    
    // リールを回転開始
    isSpinning = [true, true, true];
    isStarted = false; // レバーを引いたら投入済み状態をリセット
    leverBtn.disabled = true;
    insertBtn.disabled = true;
    stopBtns.forEach(btn => btn.disabled = false);
    messageEl.textContent = 'ストップボタンで止めよう！';

    for (let i = 0; i < 3; i++) {
        spinReel(i);
    }
}

/**
 * リールを回転させる
 */
function spinReel(index) {
    // 視覚的な回転効果
    const rotationInterval = setInterval(() => {
        if (!isSpinning[index]) {
            clearInterval(rotationInterval);
            return;
        }
        
        // ランダムな図柄を表示して回転をシミュレート
        const randomSymbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
        setReelSymbol(index, randomSymbol);
    }, 50);

    // リールオブジェクトに回転状態を保持
    reelContainers[index].dataset.intervalId = rotationInterval;
}

/**
 * 3. ストップボタン処理
 */
function handleStop(event) {
    const index = parseInt(event.target.dataset.reelIndex);
    if (!isSpinning[index]) return;

    stopReel(index);
    event.target.disabled = true;

    // 全てのリールが停止したかチェック
    if (isSpinning.every(s => s === false)) {
        checkWin();
    }
}

/**
 * リールを停止させる
 */
function stopReel(index) {
    isSpinning[index] = false;
    
    const intervalId = parseInt(reelContainers[index].dataset.intervalId);
    if (intervalId) {
        clearInterval(intervalId);
    }
    
    // 停止位置を決定
    let finalSymbol;
    if (isBonus && index === 2) {
        // ボーナス成立時、最後の停止リールを必ず「7」にする（簡略化）
        finalSymbol = '7';
    } else {
        // ランダムな位置で停止
        finalSymbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    }
    
    setReelSymbol(index, finalSymbol);
    reels[index] = finalSymbol;
}

/**
 * 4. 当たり判定と払い出し
 */
function checkWin() {
    const symbols = reels.join(',');
    let winCoins = 0;

    // 揃い役の判定 (777, BARBARBARなど)
    for (const pattern in PAYOUTS) {
        const payout = PAYOUTS[pattern];
        const pArray = pattern.split(',');
        
        // 3つ揃いの判定
        if (pArray.length === 3 && reels[0] === pArray[0] && reels[1] === pArray[1] && reels[2] === pArray[2]) {
            winCoins = payout;
            break; 
        }
    }

    // チェリーの単独当選判定（左リールにチェリーがある場合）
    if (reels[0] === '🍒' && winCoins === 0) {
        winCoins = PAYOUTS['🍒'];
    }

    if (winCoins > 0) {
        coins += winCoins;
        messageEl.textContent = `${winCoins}枚獲得！おめでとうございます！`;
    } else {
        messageEl.textContent = '残念、ハズレです。';
    }
    
    // 全リール停止後の後処理
    isStarted = false;
    stopBtns.forEach(btn => btn.disabled = true);
    updateUI();
}


// --- コイン購入機能 ---
function showPurchaseModal(amount) {
    currentPurchaseAmount = amount;
    document.getElementById('purchase-amount').textContent = amount;
    document.getElementById('purchase-modal').style.display = 'block';
    purchaseMessageEl.textContent = '';
    document.getElementById('serial-key-input').value = '';
}

// ⚠️ HTMLの onclick から呼ばれているため、DOMCotentLoaded外でもOK
function closePurchaseModal() {
    document.getElementById('purchase-modal').style.display = 'none';
}

function handleConfirmPurchase() {
    const keyInput = document.getElementById('serial-key-input').value;
    const key = parseInt(keyInput);
    
    // シリアルキーのロジック: 枚数の3倍
    const expectedKey = currentPurchaseAmount * 3;

    if (key === expectedKey) {
        coins += currentPurchaseAmount;
        purchaseMessageEl.textContent = `${currentPurchaseAmount}枚のコインを購入しました！`;
        updateUI();
        // 成功したら少し遅れてモーダルを閉じる
        setTimeout(closePurchaseModal, 1000);
    } else {
        purchaseMessageEl.textContent = 'シリアルキーが間違っています。';
    }
}

// --- 景品交換機能 ---

/**
 * 景品リストをレンダリング
 */
function renderPrizes() {
    // DOM要素が取得されていることを確認
    if (!prizesListEl || !collectionListEl) return;
    
    prizesListEl.innerHTML = '';
    collectionListEl.innerHTML = '';

    const collectionItems = [];

    PRIZES.forEach(prize => {
        if (prize.collected) {
            collectionItems.push(`<span>${prize.name}</span>`);
        } else {
            const item = document.createElement('div');
            item.className = 'prize-item';
            item.innerHTML = `
                <span>${prize.name} (${prize.cost}枚)</span>
                <button onclick="handleExchange(${prize.id})" ${coins < prize.cost ? 'disabled' : ''}>交換</button>
            `;
            prizesListEl.appendChild(item);
        }
    });

    if (prizesListEl.children.length === 0) {
        prizesListEl.innerHTML = '<p>全ての景品を交換済みです！</p>';
    }

    if (collectionItems.length > 0) {
        collectionListEl.innerHTML += collectionItems.map(item =>
