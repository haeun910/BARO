<!-- 작성 가이드: 이 주석은 GitHub 화면에 보이지 않아요. [TODO] 부분만 채우면 됩니다. -->

# 🏛️ BARO — 사용자 맞춤형 실시간 통합 민원 행정 가이드

**사용자 유형과 민원 종류를 고르면, 가까운 민원실의 실시간 현황 · 이동 정보 · AI 처리 방법 추천을 한 화면에서 안내하는 반응형 웹 서비스**

> 2026년 전국 통합데이터 활용 공모전 출품작 · 1인 개발

🔗 **Demo:** https://mowon-guide.vercel.app

<img width="1207" height="773" alt="image" src="https://github.com/user-attachments/assets/0c4e6a19-e405-473a-9eb9-863d00fb58eb" />


<br>

## 📋 소개

민원 처리에서 가장 큰 불편은 **불필요한 방문**과 **예측할 수 없는 대기**입니다. 특히 고령층, 장애인, 영유아 동반 보호자에게는 헛걸음 한 번이 큰 부담입니다.
BARO는 실시간 공공데이터 4종과 AI를 결합해, **방문 전 판단부터 민원실 도착까지** 한 흐름으로 안내합니다.

<br>

## ✨ 주요 기능

| 단계 | 기능 | 설명 |
|:-:|---|---|
| 1 | 👤 유형 선택 | 일반인 · 노약자 · 장애인 · 유모차 동반 · 임산부 · 외국인 |
| 2 | 📄 민원 선택 | 주요 민원 10종 + 직접 입력 |
| 3 | 📍 주변 민원실 | GPS 또는 주소 입력 → 거리순 목록 · 지도 · 운영 여부 |
| 4 | 🤖 AI 추천 | 방문 / 온라인(정부24) / 무인기기 중 추천 + 이유 · 구비서류 · 예상 시간 · 유형별 팁 |
| 5 | ⏱️ 실시간 현황 | 창구별 대기 인원, 자동 갱신 |
| 6 | 🚌 교통 안내 | 버스 실시간 정보 · 횡단보도 신호 잔여시간 · 교통약자 이동지원 |

<br>

## 🏗️ 아키텍처

```
Browser (index.html)
   │  fetch /api/*
   ▼
Vercel Serverless Functions (Node.js)
   ├─ /api/offices     민원실 기본정보
   ├─ /api/realtime    창구별 실시간 대기
   ├─ /api/buses       버스 노선 · 실시간 위치
   ├─ /api/signals     교차로 좌표 + 신호 잔여시간 병합
   ├─ /api/transport   교통약자 이동지원센터 · 차량 현황
   └─ /api/analyze     Claude API 처리 방법 추천
   ▼
공공데이터포털 API (한국지역정보개발원) · Anthropic API
```

- API 키는 서버리스 환경변수에만 보관하고, 브라우저는 `/api/*` 프록시만 호출합니다.
- 공공 API 호출이 실패하면 각 단계가 **데모 데이터로 자동 전환**되어 서비스 흐름이 끊기지 않습니다.

<br>

## 🗂️ 활용 데이터

| 데이터 | 제공 기관 | 데이터 ID |
|---|---|---|
| 민원실 이용 현황 실시간 정보 | 한국지역정보개발원 | 15156872 |
| 전국 초정밀 버스 실시간 위치 정보 | 한국지역정보개발원 | 15157601 |
| 교통약자 이동지원 현황 실시간 정보 | 한국지역정보개발원 | 15140825 |
| 교통안전 실시간 신호등 정보 | 한국지역정보개발원 | 15157604 |

<br>

## 🛠️ 기술 스택

| 구분 | 기술 |
|---|---|
| Frontend | HTML, CSS (clamp 반응형), Vanilla JavaScript |
| Map / Geo | Leaflet 1.9.4, OpenStreetMap, Nominatim |
| Backend | Vercel Serverless Functions (Node.js 18+) |
| AI | Anthropic Claude API |
| Deploy | Vercel |

<br>

## 📁 폴더 구조

```
├── index.html        # 6단계 화면 · 상태 관리 · 지도 · 렌더링
├── api/
│   ├── analyze.js    # AI 추천 (JSON 응답)
│   ├── offices.js
│   ├── realtime.js
│   ├── buses.js
│   ├── signals.js
│   └── transport.js
├── vercel.json       # /api 라우팅 + SPA rewrite
└── .env.example
```

<br>

## 🚀 실행 방법

```bash
npm i -g vercel
cp .env.example .env    # DATA_API_KEY, CLAUDE_API_KEY 입력
vercel dev              # → http://localhost:3000
```

<br>

## 🔧 트러블슈팅

**1. CORS와 API 키 노출**
공공 API를 브라우저에서 직접 호출하면 CORS 오류가 나고 키가 노출됩니다. Vercel 서버리스 함수를 프록시로 두어 두 문제를 함께 해결했습니다.

**2. 따로 제공되는 신호등 데이터**
교차로 위치와 신호 잔여시간이 별도 API여서, 교차로 정보를 먼저 조회한 뒤 교차로 ID 기준으로 병합해 하나의 카드로 보여 줍니다.

**3. AI 응답을 UI에 안정적으로 쓰기**
프롬프트에 JSON 스키마를 명시하고, 응답의 코드블록 표기를 제거한 뒤 파싱해 정해진 화면 요소에 렌더링합니다.

**4. 실시간 API 응답 불안정**
API 승인 후에도 실제 응답을 안정적으로 받지 못했습니다(원인 미확인). 단계마다 실패 시 데모 데이터로 전환하는 fallback을 두어 전체 흐름을 시연할 수 있게 했습니다.

<br>

## 📌 한계 및 개선 계획

- [ ] 실시간 공공 API 4종 실제 응답 연동 검증
- [ ] 출발지–민원실 실제 경로 탐색
- [ ] 접근성 정보(엘리베이터 · 경사로 등) 실데이터 반영
- [ ] 보건소 · 도서관 등 타 공공시설로 확장

<br>

## 🖥️ 화면

<!-- TODO: 캡처 추가 -->
| 유형 선택 | AI 추천 | 실시간 현황 | 교통 안내 |
|---|---|---|---|
| <img width="1123" height="1678" alt="image" src="https://github.com/user-attachments/assets/f91df10a-ddaa-49e9-bb6f-ecfe29c65e5d" />
 | <img width="1103" height="1252" alt="image" src="https://github.com/user-attachments/assets/d87ecf61-f367-4bac-b87b-fef61ae0547b" />
 | <img width="1139" height="1134" alt="image" src="https://github.com/user-attachments/assets/e380f978-b5c2-47ab-8c95-d866467a337a" />
 | <img width="1178" height="1897" alt="image" src="https://github.com/user-attachments/assets/e17990ad-4d3c-4119-afbb-ddbbf1a10fa6" />
 |
