# 💥 HAVOC LAB: Quantum Physics & Ragdoll Chaos Sandbox

> **"중력을 비틀고, 래그돌을 집어던지며, 블랙홀과 포탈로 즐기는 극한의 물리 실험실!"**  
> 🌐 **Live Demo:** [https://jeiel85.github.io/havoc-lab/](https://jeiel85.github.io/havoc-lab/)

---

## ⚡ 주요 특징 (Key Features)

- 🧪 **실감나는 2D 물리 엔진 (Matter.js 기반)**
  - 관절이 흐느적거리는 익살스러운 표정의 **래그돌(Ragdoll)**
  - 유연하게 출렁이는 **소프트바디 젤리(Jelly Blob)**
  - 연쇄 충돌을 유발하는 **도미노, 통통 튀는 바운스볼, 무거운 쇠구슬**
- 🌀 **초차원 장치 & 무기 시스템**
  - **블랙홀 (Singularity)**: 주변의 모든 물체와 래그돌을 빨아들이는 중력 소용돌이
  - **포탈 게이트 (Wormholes A & B)**: 진입 시 운동량을 유지하며 반대편으로 사출
  - **C4 폭탄 / TNT**: 연쇄 폭발 및 맹렬한 파편과 충격파
  - **충격파 펄스건 (Repulsor Pulse)**: 우클릭 또는 펄스 툴로 순간적인 압축 공기 발사
  - **슈퍼 점프대 트램펄린 (Jump Pad)**: 닿는 순간 하늘 높이 점프
- ⏳ **매트릭스 불릿 타임 (Bullet Time Slow-Motion)**
  - `[SPACE]` 바를 누르면 0.2배속 슬로우 모션으로 감속되며 저역통과 필터(Low-pass filter) 사운드 왜곡 발동!
- 🎵 **100% 절차적 Web Audio API 사운드**
  - 외부 오디오 파일 다운로드 0개! 순수 자바스크립트 오실레이터로 타격음, 폭발음, 레이저, 포탈 워프 사운드 및 신스웨이브 BGM 생성
- 🏆 **2가지 게임 플레이 모드**
  - **샌드박스 놀이터 (Sandbox Playground)**: 무제한 아이템 소환 & 자유로운 물리 실험
  - **챌린지 미션 (5개 스테이지)**: 포탈 다이빙, 연쇄 도미노 폭파, 10초 공중 부양 버티기, 블랙홀 농구, 회전 레이저 탈출 등

---

## 🎮 조작법 (Controls)

- **마우스 좌클릭 & 드래그**: 물체 잡고 던지기 (GRAB 툴) / 선택한 도구 소환
- **마우스 우클릭**: 어디서나 충격파 펄스 발사 (Repulsor Shockwave)
- **폭탄 클릭**: 시한 폭탄 즉시 기폭
- **[SPACE] 키**: 불릿 타임 (슬로우 모션) 토글
- **하단 중력 제어 바**: 1.0G(지구), 0.0G(무중력), -1.0G(반중력), 0.25G(달), 2.4G(목성), 좌/우 중력

---

## 🛠️ 기술 스택 (Tech Stack)

- **Engine:** Vite, TypeScript, Canvas 2D API
- **Physics:** Matter.js
- **Audio:** Web Audio API (Synthesizer & DSP Nodes)
- **Effects:** Procedural Particle System, Screen Shake, Canvas Confetti
- **Deployment:** GitHub Actions & GitHub Pages
