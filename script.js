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

// 플레이어 마커를 특정 타일의 중앙에 이동
function movePlayerMarkerToTile(tileIndex) {
    const tile = document.querySelector(`.tile[data-index="${tileIndex}"]`);
    const tileRect = tile.getBoundingClientRect();
    const mapRect = map.getBoundingClientRect();

    // 마커를 타일의 중앙에 위치시키기 위해 타일의 위치와 크기를 계산
    playerMarker.style.position = 'absolute';
    playerMarker.style.left = `${tileRect.left - mapRect.left + window.scrollX + (tileRect.width / 2) - (playerMarker.offsetWidth / 2)}px`;
    playerMarker.style.top = `${tileRect.top - mapRect.top + window.scrollY + (tileRect.height / 2) - (playerMarker.offsetHeight / 2)}px`;

    currentTileIndex = tileIndex; // 현재 타일 인덱스를 업데이트합니다.
}
