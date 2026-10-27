# 작업 인수인계: mini-juice-shop

작성일: 2026-10-28 (한국 시간)

## 1. 먼저 알아야 할 목적

이 저장소는 OWASP Juice Shop을 보안 진단 Agent의 테스트 대상으로 쓰기 위해 정리한 학습용 소스입니다. Juice Shop 자체의 기능 개발이나 취약점 일괄 수정이 현재 목표는 아닙니다.

검증하려는 Agent의 흐름은 다음과 같습니다.

```text
설계문서 + 소스코드
  → STRIDE로 위협 도출
  → OWASP ASVS를 기준으로 통제 요구사항 도출
  → 코드에서 통제 구현·누락 확인
  → 위치·근거·위험 사유·수정 방법 보고
  → 별도 정답과 비교해 탐지·누락·오탐 평가
```

첫 번째 API는 **`GET /rest/basket/:id`(장바구니 조회)**로 선정했습니다. 현재는 사람이 코드를 이해하는 단계이며, 정답표·참조 정상 코드·자동 채점 테스트는 아직 작성하지 않았습니다.

## 2. 새 PC에서 시작하기

준비물은 Git, Docker와 코드를 읽을 에디터입니다. Docker Desktop을 사용한다면 Linux 컨테이너 엔진이 실행 중이어야 합니다. Docker 방식에서는 PC에 Node.js와 npm을 별도로 설치할 필요가 없습니다.

원하는 작업 폴더에서 다음 명령을 실행합니다.

```powershell
git clone https://github.com/LWH4Data/mini-juice-shop.git
cd mini-juice-shop
docker info --format '{{.ServerVersion}}'
docker build -t mini-juice-shop .
docker run --rm --name mini-juice-shop -p 127.0.0.1:3000:3000 mini-juice-shop
```

`Server listening on port 3000` 로그를 확인하고 [http://localhost:3000](http://localhost:3000)을 엽니다. 상품 목록이 표시되고 메뉴와 검색이 동작하는지 확인합니다.

실행 터미널은 열어 둡니다. 별도 터미널에서 다음 명령으로 상태를 확인할 수 있습니다.

```powershell
docker ps --filter name=mini-juice-shop
docker logs --tail 50 mini-juice-shop
```

PowerShell에서는 HTTP 응답도 확인할 수 있습니다.

```powershell
(Invoke-WebRequest -Uri 'http://localhost:3000/' -TimeoutSec 10).StatusCode
```

정상 응답은 `200`입니다. 종료는 실행 터미널의 `Ctrl+C` 또는 `docker stop mini-juice-shop`을 사용합니다. 다음 실행은 같은 `docker run` 명령만 실행하면 됩니다. 파일을 바꾼 뒤에는 컨테이너를 종료하고 이미지를 다시 빌드합니다.

이 실행 명령에는 볼륨 연결이 없습니다. 컨테이너는 종료 시 자동 제거되며, 컨테이너 내부의 DB·업로드 파일·로그는 새 PC로 이전되지 않습니다. 브라우저의 로그인·진행 상태도 Git으로 이전되지 않습니다.

## 3. 문서와 코드 읽기 순서

1. [README.md](README.md): 디렉터리 구조와 Docker 실행·확인 절차
2. [REVIEW.md](REVIEW.md): 대상 API를 읽는 순서, 현재 줄 번호, 질문과 문법 참고
3. REVIEW.md에 연결된 소스: 한국어 주석을 보며 실행 흐름 추적

리뷰의 핵심은 **요청한 장바구니 ID / 인증된 사용자 ID / DB의 장바구니 소유자 ID**를 구분하고, 이 값들이 어디에서 비교되어 응답을 제어하는지 찾는 것입니다.

| 순서 | 파일 | 읽을 대상 |
|---|---|---|
| 1 | [server.ts](server.ts) | 대상 GET 라우트와 먼저 적용되는 공통 미들웨어 |
| 2 | [routes/login.ts](routes/login.ts) | `afterLogin()`의 사용자·장바구니 연결과 JWT 발급 |
| 3 | [lib/insecurity.ts](lib/insecurity.ts) | 사용자 정보 저장·복원, JWT 검사, `appendUserId()` |
| 4 | [models/basket.ts](models/basket.ts), [models/relations.ts](models/relations.ts) | `id`, `UserId`, 상품 연결 관계 |
| 5 | [routes/basket.ts](routes/basket.ts) | `retrieveBasket()` 전체 |
| 6 | [lib/challengeUtils.ts](lib/challengeUtils.ts), [lib/utils.ts](lib/utils.ts) | 과제 판정·응답 포장·오류 전달의 역할 구분 |
| 7 | [basket.service.ts](frontend/src/app/Services/basket.service.ts), [request.interceptor.ts](frontend/src/app/Services/request.interceptor.ts) | 브라우저의 URL 생성과 인증 헤더 설정 |

## 4. 지금까지 반영한 변경

- 애플리케이션의 package.json 버전은 `20.3.0`입니다.
- AI 도구·원본 저장소 운영·테스트·패키징·배포 보조 디렉터리 15개를 제거했습니다.
- 원본 프로젝트의 기여·품질 검사 등 루트 파일 13개를 제거했습니다.
- 서비스 코드, 보안 실습 자료, 원본 LICENSE는 유지했습니다.
- 관련 TypeScript 파일 10개에 학습용 한국어 주석을 추가하고 주석·코드 묶음 사이에 빈 줄을 넣었습니다.
- 위 TypeScript 변경은 주석과 빈 줄 추가이며 기존 실행 코드 줄은 보존했습니다. 소유권 검사 등 보안 수정은 아직 적용하지 않았습니다.
- README.md와 REVIEW.md를 현재 구조에 맞게 작성했습니다.
- REFERENCES.md, SECURITY.md, SOLUTIONS.md, threat-model.json은 추가 검토 전까지 유지하기로 했습니다.

제거한 주요 디렉터리: `.ai`, `.claude`, `.codeium`, `.continue`, `.cursor`, `.junie`, `.github`, `.dependabot`, `test`, `rsn`, `screenshots`, `scripts`, `vagrant`, `terraform`, `monitoring`.

`infrastructure`, `ftp`, `encryptionkeys`, `.well-known`, `data/static`은 보안 실습 자료와 연결되어 있어 남겨 두었습니다. 컨테이너 실행에는 루트 Dockerfile을 사용합니다.

## 5. 확인한 것과 아직 확인하지 않은 것

| 항목 | 상태 |
|---|---|
| 기존 PC의 Docker 컨테이너 실행·로컬 HTTP 200 | 준비 과정에서 확인 |
| TypeScript 학습 주석 추가 후 실행 코드 보존 | 파일 비교로 확인 |
| 주석·코드 묶음의 빈 줄 정리 | 빈 줄 추가 외 변경이 없음을 확인 |
| 코드 리뷰 문서의 줄 번호 | 작성·갱신 시 소스 기준으로 확인 |
| 새 PC에서 이미지 재빌드 및 실행 | 새 PC에서 수행할 항목 |
| 대상 API의 사용자별 접근 재현 | 아직 수행하지 않음 |
| 요구사항·정답표·참조 정상 코드·채점 테스트 | 아직 작성하지 않음 |
| Agent 진단 정확도·비교 평가 | 아직 수행하지 않음 |

기존 Docker 이미지나 실행 중인 컨테이너가 이 Git 저장소에 포함되는 것은 아닙니다. 새 PC에서는 소스로 다시 빌드해야 합니다.

## 6. 다음 작업

1. 새 PC에서 Docker 빌드·실행 및 웹 화면 확인
2. REVIEW.md 순서대로 코드 읽기와 리뷰 기록표 작성
3. API의 업무 정책 확정: 소유자 접근, 관리자 예외, 존재하지 않는 ID, 오류 응답 등
4. Agent 입력으로 사용할 업무 설계문서와 API 계약 작성
5. 별도 비공개 평가 저장소에서 사람이 정한 위협·ASVS 매핑·정답 판정표 작성
6. 취약 코드·참조 정상 코드·공통 계층에서 통제하는 정상 코드와 실행 테스트 준비
7. 정답을 전달하지 않은 새 Agent 세션으로 진단하고 탐지·누락·오탐·근거 정확성 비교

처음에는 인증과 장바구니 소유권으로 범위를 한정합니다. ASVS 항목을 참조할 때는 버전도 함께 고정합니다. 이 API 하나의 결과를 전체 서비스나 Agent 전반의 보안 성능으로 확대 해석하지 않습니다.

## 7. 공개 학습 저장소와 비공개 평가 자료 분리

이 공개 저장소에는 학습 주석·리뷰 관점과 원본 과제 단서가 있습니다. 그대로 제공하면 독립적인 진단 능력 평가가 되지 않을 수 있습니다. 현재 작업 대화의 정답 지식을 가진 세션도 평가용으로 재사용하지 않습니다.

| Agent에 제공 | 평가기에만 제공 |
|---|---|
| 업무 설계문서·API 계약 | 정답 위협·통제 매핑·기대 판정 |
| 분석 대상 코드와 필요한 의존 코드 | 참조 수정본·수정 diff |
| 해당 평가에서 허용한 분석 도구 | 채점용 테스트·정답 라벨·이전 채점 결과 |

권장 구조는 별도 비공개 `mini-juice-shop-evaluation` 저장소입니다. **아직 이 평가 저장소를 생성하지 않았습니다.** 진단 Agent에는 허용 자료만 내보낸 별도의 작업 디렉터리를 제공합니다. 저장소를 나누거나 `.gitignore`에 적는 것만으로 파일 읽기가 차단되지는 않습니다. Git 이력·리뷰 문서·백업·정답 파일을 포함한 접근 범위도 제한합니다.

현재 Dockerfile의 `COPY .`는 빌드 대상 파일을 이미지에 넣습니다. 정답 자료는 이 공개 소스나 빌드 컨텍스트 안에 두지 않습니다.

## 8. 남아 있는 제약과 Git 이력

- 원본 package.json에는 삭제한 `test`, `rsn`, `scripts`, `vagrant` 등을 참조하는 개발 명령이 일부 남아 있습니다. 현재 안내는 루트 Dockerfile로 빌드·실행하는 방식입니다. 이 명령 정리는 아직 수행하지 않았습니다.
- 잠금 파일을 사용하지 않는 현재 npm 설정과 Dockerfile의 버전 범위 때문에, 다른 날짜의 빌드에서 의존성 세부 버전이 달라질 수 있습니다. 설치 실패가 나면 첫 오류와 빌드 로그를 보존하고 별도 확인합니다.
- 공개 저장소에는 현재 정리된 소스를 새 초기 스냅샷으로 올립니다. 원본 전체 Git 이력·학습 전 백업 압축본·로컬 DB는 포함하지 않습니다.
- 기반 원본: https://github.com/juice-shop/juice-shop
- 기반 원본 커밋: `717f5efa886b0417eeecb52378b03cf10567b7e2`
- 원래 PC의 바탕화면 작업 폴더는 기존 upstream Git 이력을 그대로 보존합니다. 새 공개 저장소와 별도의 이력이므로, 다음 PC에서는 위 공개 저장소를 새로 clone해서 이어갑니다.
- 원본 프로젝트의 LICENSE를 유지합니다.

## 9. 다음 작업 Agent에게 전달할 문장

> 이 저장소의 README.md와 REVIEW.md, HANDOFF.md를 먼저 읽고 현재 상태를 파악해 줘. 목적은 Juice Shop 개발이 아니라 설계문서와 코드의 통제 누락을 찾는 보안 진단 Agent를 평가할 테스트를 준비하는 것이다. 대상은 GET /rest/basket/:id이며, 먼저 내가 코드를 이해하도록 도와줘. 코드 리뷰 후 업무 정책과 테스트 설계를 확정한다. 정답 자료와 참조 수정본은 이 공개 저장소에 작성하거나 커밋하지 않는다. 기존 의도적 취약점은 요청 없이 수정하지 않는다.
