const map = document.getElementById('map');
const battlefield = document.getElementById('battlefield');
const cardSelection = document.getElementById('card-selection');
const statsDisplay = document.getElementById('stats');  // 병사 스탯을 표시할 div
const playerMarker = document.createElement('div');  // 플레이어의 위치를 나타내는 마커

let soldiers = 10;
let playerSoldiers = [];
let currentStage = null;
let enemySoldiers = [];
let clearedTiles = 0; // 클리어한 타일의 수를 추적
let startTileIndex = 0; // 시작 타일 인덱스
let endTileIndex = 24;  // 끝 타일 인덱스
let currentTileIndex = startTileIndex; // 현재 플레이어의 위치
let isMuted = false; // 음소거 상태를 추적

let attackIncrease;
let healthIncrease;

// Web Audio API로 오디오 컨텍스트 생성
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// 음소거 버튼 추가
function createMuteButton() {
    const muteButton = document.createElement('button');
    muteButton.innerText = '🔈 음소거';
    muteButton.style.position = 'absolute';
    muteButton.style.top = '10px';
    muteButton.style.right = '10px';
    muteButton.style.fontSize = '20px';

    muteButton.onclick = () => {
        isMuted = !isMuted;
        muteButton.innerText = isMuted ? '🔇 음소거 해제' : '🔈 음소거';
    };

    document.body.appendChild(muteButton);
}

// 비프음 생성 함수 (음소거 기능 적용)
function playBeep() {
    if (isMuted) return; // 음소거 상태라면 소리를 재생하지 않음

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 440; // A4 음
    oscillator.type = 'square';
    gainNode.gain.setValueAtTime(0, audioContext.currentTime); // 0.1은 음량

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.1); // 0.1초 동안 재생
}

// 병사 클래스 정의
class Soldier {
    constructor(team, x, y, health = 100, attackPower = Math.floor(Math.random() * 10) + 1, index = 0) {
        this.team = team;
        this.element = document.createElement('div');
        this.element.className = `soldier ${team}`;
        this.element.style.position = 'absolute';
        this.element.style.width = '10px';
        this.element.style.height = '10px';
        this.element.style.backgroundColor = team === 'teamA' ? 'red' : 'blue';
        this.element.style.left = `${x}px`;
        this.element.style.top = `${y}px`;
        this.health = health;
        this.attackPower = attackPower;
        this.index = index; // 병사의 번호
        battlefield.appendChild(this.element);
        this.updateStats();  // 초기 스탯 표시
    }

    moveToward(target) {
        const dx = target.element.offsetLeft - this.element.offsetLeft;
        const dy = target.element.offsetTop - this.element.offsetTop;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const speed = 2;  // 이동 속도 조절 (2px per frame)

        if (distance > speed) {
            this.element.style.left = `${this.element.offsetLeft + (dx / distance) * speed}px`;
            this.element.style.top = `${this.element.offsetTop + (dy / distance) * speed}px`;
        }
    }

    takeDamage(damage) {
        this.health -= damage;
        if (this.health <= 0) {
            this.die();
        }
        this.updateStats(); // 피해를 입으면 스탯 업데이트
    }

    die() {
        battlefield.removeChild(this.element);
        this.removeStats(); // 사망 시 스탯 제거
    }

    updateStats() {
        const statElement = document.getElementById(`soldier-stat-${this.index}`);
        if (statElement) {
            statElement.innerText = `병사 ${this.index + 1}: 체력 ${this.health}, 공격력 ${this.attackPower}`;
        }
    }

    removeStats() {
        const statElement = document.getElementById(`soldier-stat-${this.index}`);
        if (statElement) {
            statsDisplay.removeChild(statElement);
        }
    }
}

// 병사 번호 찾기 함수
function findAvailableIndex() {
    const existingIndices = playerSoldiers.map(soldier => soldier.index);
    let newIndex = 0;
    while (existingIndices.includes(newIndex)) {
        newIndex++;
    }
    return newIndex;
}

// 병사 추가 함수 (카드 선택 시 호출)
function addNewSoldier() {
    const newIndex = findAvailableIndex();  // 빈 번호를 찾음
    const newSoldier = new Soldier('teamA', Math.random() * 200, Math.random() * 400, 100, Math.floor(Math.random() * 10) + 1, newIndex);
    playerSoldiers.push(newSoldier);
    soldiers++;

    // 새로운 병사의 스탯을 화면에 표시
    const statElement = document.createElement('div');
    statElement.id = `soldier-stat-${newSoldier.index}`;
    statElement.innerText = `병사 ${newSoldier.index + 1}: 체력 ${newSoldier.health}, 공격력 ${newSoldier.attackPower}`;
    statsDisplay.appendChild(statElement);
}

// 카드 혜택을 랜덤하게 설정하는 함수
function randomizeCardBenefits() {
    attackIncrease = Math.floor(Math.random() * 5) + 1;  // 공격력 증가량 (1 ~ 5)
    healthIncrease = Math.floor(Math.random() * 30) + 10;  // 체력 증가량 (10 ~ 40)

    // 카드 UI 업데이트
    document.getElementById('attack-card').innerText = `공격력 증가 (+${attackIncrease})`;
    document.getElementById('defense-card').innerText = `체력 증가 (+${healthIncrease})`;
}

// 맵 생성 함수
function createMap() {
    map.innerHTML = ''; // 맵을 다시 표시하기 전에 초기화
    for (let i = 0; i < 25; i++) {
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.dataset.index = i; // 타일 인덱스를 데이터 속성에 저장

        // 시작 타일과 끝 타일 구별
        if (i === startTileIndex) {
            tile.style.backgroundColor = '#4CAF50'; // 시작 타일 색상 (초록색)
            tile.innerText = '시작';
            tile.dataset.cleared = 'true'; // 시작 타일은 이미 클리어된 것으로 간주
        } else if (i === endTileIndex) {
            tile.style.backgroundColor = '#f44336'; // 끝 타일 색상 (빨간색)
            tile.innerText = '끝 (적 20명)';
            tile.dataset.enemyCount = 20; // 끝 타일의 적 수
        } else {
            tile.innerText = Math.floor(Math.random() * 10) + 1;  // 랜덤 적 병사 수
            tile.dataset.cleared = 'false'; // 타일의 초기 상태를 설정
        }

        tile.onclick = () => selectStage(tile);
        map.appendChild(tile);
    }

    updateSelectableTiles();

    // 플레이어 병사 초기화
    initializePlayerSoldiers();

    // 플레이어 마커 초기화
    initializePlayerMarker();
}

// 플레이어 병사 초기화
function initializePlayerSoldiers() {
    playerSoldiers = [];
    statsDisplay.innerHTML = ''; // 기존 스탯 초기화
    for (let i = 0; i < soldiers; i++) {
        const soldier = new Soldier('teamA', Math.random() * 200, Math.random() * 400, 100, Math.floor(Math.random() * 10) + 1, i);
        playerSoldiers.push(soldier);

        // 스탯을 화면에 표시
        const statElement = document.createElement('div');
        statElement.id = `soldier-stat-${i}`;
        statElement.innerText = `병사 ${i + 1}: 체력 ${soldier.health}, 공격력 ${soldier.attackPower}`;
        statsDisplay.appendChild(statElement);
    }
}

// 플레이어 마커 초기화
function initializePlayerMarker() {
    playerMarker.style.width = '20px';
    playerMarker.style.height = '20px';
    playerMarker.style.backgroundColor = 'blue';
    playerMarker.style.borderRadius = '50%';
    playerMarker.style.position = 'absolute';
    movePlayerMarkerToTile(startTileIndex);
    map.appendChild(playerMarker);
}

// 플레이어 마커를 특정 타일의 중앙에 이동
function movePlayerMarkerToTile(tileIndex) {
    const tile = document.querySelector(`.tile[data-index="${tileIndex}"]`);
    
    // 타일의 위치와 크기를 가져옵니다.
    const tileRect = tile.getBoundingClientRect();
    
    // 타일이 속한 map의 위치를 고려하여 상대적인 위치를 계산합니다.
    playerMarker.style.position = 'absolute';
    playerMarker.style.left = `${tile.offsetLeft + (tileRect.width / 2) - (playerMarker.offsetWidth / 2)}px`;
    playerMarker.style.top = `${tile.offsetTop + (tileRect.height / 2) - (playerMarker.offsetHeight / 2)}px`;

    currentTileIndex = tileIndex; // 현재 타일 인덱스를 업데이트합니다.
}

// 스테이지 선택
function selectStage(tile) {
    const tileIndex = parseInt(tile.dataset.index);

    if (tile.dataset.cleared === 'true') return; // 이미 처치한 타일은 선택할 수 없음
    if (!isTileSelectable(tileIndex)) return; // 선택할 수 없는 타일이면 종료

    currentStage = tile.dataset.enemyCount ? parseInt(tile.dataset.enemyCount) : parseInt(tile.innerText);
    
    movePlayerMarkerToTile(tileIndex); // 타일 선택 후, 마커를 먼저 이동시킵니다.
    
    map.style.display = 'none';
    battlefield.style.display = 'block';
    
    startBattle(tile);
}

// 타일 선택 가능 여부 확인
function isTileSelectable(tileIndex) {
    if (tileIndex === startTileIndex) return false; // 시작 타일은 선택 불가

    // 현재 플레이어의 위치에서 인접한 타일만 선택 가능
    return areTilesAdjacent(currentTileIndex, tileIndex);
}

// 타일이 인접해 있는지 확인하는 함수
function areTilesAdjacent(index1, index2) {
    const row1 = Math.floor(index1 / 5);
    const col1 = index1 % 5;
    const row2 = Math.floor(index2 / 5);
    const col2 = index2 % 5;

    const rowDiff = Math.abs(row1 - row2);
    const colDiff = Math.abs(col1 - col2);

    return (rowDiff <= 1 && colDiff <= 1); // 상하좌우 및 대각선까지 인접 확인
}

// 선택 가능한 타일 업데이트
function updateSelectableTiles() {
    const tiles = document.querySelectorAll('.tile');
    tiles.forEach(tile => {
        const tileIndex = parseInt(tile.dataset.index);
        if (isTileSelectable(tileIndex) && tile.dataset.cleared === 'false') {
            tile.style.backgroundColor = '#ffeb3b'; // 선택 가능한 타일 색상 (노란색)
        } else if (tile.dataset.cleared === 'false' && tileIndex !== endTileIndex) {
            tile.style.backgroundColor = '#aaa'; // 기본 타일 색상 (회색)
        }
    });
}

// 전투 시작
function startBattle(tile) {
    battlefield.innerHTML = ''; // 전투 시작 전 필드를 초기화
    enemySoldiers = [];

    // 기존 플레이어 병사 유지 및 필드에 추가
    playerSoldiers.forEach(soldier => {
        battlefield.appendChild(soldier.element);  // 병사를 다시 전투 필드에 추가
    });

    // 적 병사 초기화
    for (let i = 0; i < currentStage; i++) {
        const enemy = new Soldier('teamB', 600 + Math.random() * 200, Math.random() * 400);
        enemySoldiers.push(enemy);
    }

    if (playerSoldiers.length === 0) {
        alert('게임 오버!');
        createRestartButton(); // 게임 오버 시 재시작 버튼 표시
    } else {
        // 전투 로직
        distributeTargets(); // 병사들이 적을 적절히 나누어 타겟팅
        simulateBattle(tile);
    }
}

// 타겟 분배 함수
function distributeTargets() {
    const numEnemies = enemySoldiers.length;
    playerSoldiers.forEach((soldier, index) => {
        const targetIndex = index % numEnemies; // 병사들을 적 병사들에 균등하게 분배
        soldier.target = enemySoldiers[targetIndex]; // 각 병사에게 타겟 할당
    });
}

// 전투 시뮬레이션
function simulateBattle(tile) {
    if (playerSoldiers.length === 0 || enemySoldiers.length === 0) {
        endBattle(tile);
        return;
    }

    playerSoldiers.forEach((soldierA) => {
        if (!soldierA.target || !enemySoldiers.includes(soldierA.target)) {
            soldierA.target = findClosestEnemy(soldierA, enemySoldiers);
        }

        if (soldierA.target) {
            soldierA.moveToward(soldierA.target);

            const dx = soldierA.target.element.offsetLeft - soldierA.element.offsetLeft;
            const dy = soldierA.target.element.offsetTop - soldierA.element.offsetTop;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance <= 5) {
                playBeep();
                soldierA.takeDamage(soldierA.target.attackPower);
                soldierA.target.takeDamage(soldierA.attackPower);

                if (soldierA.health <= 0) {
                    playerSoldiers.splice(playerSoldiers.indexOf(soldierA), 1);
                }
                if (soldierA.target.health <= 0) {
                    enemySoldiers.splice(enemySoldiers.indexOf(soldierA.target), 1);
                }
            }
        }
    });

    enemySoldiers.forEach((soldierB) => {
        if (!soldierB.target || !playerSoldiers.includes(soldierB.target)) {
            soldierB.target = findClosestEnemy(soldierB, playerSoldiers);
        }

        if (soldierB.target) {
            soldierB.moveToward(soldierB.target);

            const dx = soldierB.target.element.offsetLeft - soldierB.element.offsetLeft;
            const dy = soldierB.target.element.offsetTop - soldierB.element.offsetTop;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance <= 5) {
                playBeep();
                soldierB.takeDamage(soldierB.target.attackPower);
                soldierB.target.takeDamage(soldierB.attackPower);

                if (soldierB.health <= 0) {
                    enemySoldiers.splice(enemySoldiers.indexOf(soldierB), 1);
                }
                if (soldierB.target.health <= 0) {
                    playerSoldiers.splice(playerSoldiers.indexOf(soldierB.target), 1);
                }
            }
        }
    });

    requestAnimationFrame(() => simulateBattle(tile));
}

// 가장 가까운 적을 찾는 함수
function findClosestEnemy(soldier, enemies) {
    let closestEnemy = null;
    let closestDistance = Infinity;

    enemies.forEach(enemy => {
        const dx = enemy.element.offsetLeft - soldier.element.offsetLeft;
        const dy = enemy.element.offsetTop - soldier.element.offsetTop;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < closestDistance) {
            closestDistance = distance;
            closestEnemy = enemy;
        }
    });

    return closestEnemy;
}




// 전투 종료 처리
function endBattle(tile) {
    if (playerSoldiers.length > 0) {
        tile.dataset.cleared = 'true'; // 타일을 클리어한 상태로 표시
        tile.innerText = '처치 완료'; // 타일에 "처치 완료"로 표시
        tile.style.backgroundColor = '#444'; // 타일의 색상을 변경하여 완료 표시
        tile.style.color = '#fff'; // 텍스트 색상을 흰색으로 변경

        if (parseInt(tile.dataset.index) === endTileIndex) {
            showVictory(); // 끝 타일 점령 시 엔딩 표시
        } else {
            updateSelectableTiles(); // 전투 후 선택 가능한 타일 업데이트
            setTimeout(showCardSelection, 500); // 카드 선택 화면으로 이동
        }
    } else {
        alert('게임 오버!');
        createRestartButton(); // 게임 오버 시 재시작 버튼 표시
    }
}

// 폭죽 애니메이션과 승리 메시지 표시
function showVictory() {
    const victoryMessage = document.createElement('div');
    victoryMessage.innerText = `점령 성공! 남은 병사: ${playerSoldiers.length}명`;
    victoryMessage.style.fontSize = '48px';
    victoryMessage.style.color = 'gold';
    victoryMessage.style.position = 'absolute';
    victoryMessage.style.top = '50%';
    victoryMessage.style.left = '50%';
    victoryMessage.style.transform = 'translate(-50%, -50%)';
    victoryMessage.style.textAlign = 'center';
    document.body.appendChild(victoryMessage);

    createRestartButton(); // 승리 시 재시작 버튼 표시

    // 반복적인 폭죽 애니메이션을 추가하는 부분
    setInterval(() => {
        for (let i = 0; i < 20; i++) {
            createFirework();
        }
    }, 1000); // 1초마다 폭죽 애니메이션을 반복적으로 실행
}

// 폭죽 생성 함수
function createFirework() {
    const firework = document.createElement('div');
    firework.style.position = 'absolute';
    firework.style.width = '5px';
    firework.style.height = '5px';
    firework.style.backgroundColor = 'red';
    firework.style.borderRadius = '50%';
    firework.style.left = `${Math.random() * 100}%`;
    firework.style.top = `${Math.random() * 100}%`;
    firework.style.opacity = 0;

    document.body.appendChild(firework);

    setTimeout(() => {
        firework.style.transition = 'transform 0.5s ease, opacity 0.5s ease';
        firework.style.transform = `scale(${Math.random() * 3 + 1})`;
        firework.style.opacity = 1;

        setTimeout(() => {
            firework.style.transform = 'scale(0)';
            firework.style.opacity = 0;

            setTimeout(() => {
                document.body.removeChild(firework);
            }, 500);
        }, 500);
    }, Math.random() * 500);
}

// 게임 재시작 버튼 추가
function createRestartButton() {
    const restartButton = document.createElement('button');
    restartButton.innerText = '🔄 재시작';
    restartButton.style.position = 'absolute';
    restartButton.style.top = '70%';
    restartButton.style.left = '50%';
    restartButton.style.transform = 'translate(-50%, -50%)';
    restartButton.style.fontSize = '24px';

    restartButton.onclick = () => {
        document.location.reload(); // 페이지를 새로고침하여 게임을 재시작
    };

    document.body.appendChild(restartButton);
}

// 카드 선택 화면
function showCardSelection() {
    battlefield.style.display = 'none';
    cardSelection.style.display = 'block';
    randomizeCardBenefits();  // 카드 선택 화면 표시 시 새로운 혜택을 랜덤화
}

// 카드 선택 로직
function selectCard(type) {
    cardSelection.style.display = 'none';
    map.style.display = 'grid'; // 타일을 다시 그리드로 표시

    switch (type) {
        case 'attack':
            playerSoldiers.forEach(soldier => {
                soldier.attackPower += attackIncrease;
                soldier.updateStats();  // 병사의 스탯을 업데이트
            });
            alert(`공격력이 ${attackIncrease}만큼 증가했습니다!`);
            break;
        case 'defense': // 체력 증가로 수정
            playerSoldiers.forEach(soldier => {
                soldier.health += healthIncrease;
                soldier.updateStats();  // 병사의 스탯을 업데이트
            });
            alert(`체력이 ${healthIncrease}만큼 증가했습니다!`);
            break;
        case 'reinforcement':
            addNewSoldier();  // 빈 번호를 찾고 병사 추가
            alert('새로운 병사가 추가되었습니다!');
            break;
    }
}

// 게임 초기화 함수
function initGame() {
    createMap();
    randomizeCardBenefits();
//    createMuteButton(); // 음소거 버튼 추가
}

initGame();
