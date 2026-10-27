# mini-juice-shop

OWASP Juice Shop을 로컬 보안 테스트 대상으로 실행하기 위한 작업 폴더입니다. 애플리케이션 버전은 `20.3.0`이며, Express 서버와 Angular 프런트엔드로 구성되어 있습니다.

개발·원본 저장소 운영용 디렉터리와 설정 일부를 제거했습니다. 이 문서는 현재 남아 있는 구조와 **루트 Dockerfile을 이용한 빌드 → 서버 실행 → 웹 확인** 절차를 설명합니다.

## 1. 디렉터리 구조

작업 경로: 이 저장소를 복제한 `mini-juice-shop` 폴더입니다. 새 PC에서 시작하는 순서는 [HANDOFF.md](HANDOFF.md)를 참고합니다.

```text
mini-juice-shop/
├─ .git/                    # 변경 이력 및 원격 저장소 정보
├─ .well-known/             # security.txt, CSAF 등 웹 제공 자료
├─ config/                  # 기본·CTF 등 애플리케이션 설정
├─ data/                    # 초기 데이터 생성 및 실습 과제 자료
│  └─ static/
│     ├─ challenges.yml     # 실습 과제 정의
│     └─ codefixes/          # 코딩 과제의 수정 코드 자료
├─ encryptionkeys/          # 서비스·실습용 키 파일
├─ frontend/                # Angular 프런트엔드
│  ├─ package.json          # 프런트엔드 의존성 및 빌드 명령
│  ├─ angular.json          # Angular 빌드 설정
│  └─ src/
│     ├─ main.ts            # 프런트엔드 진입점
│     ├─ app/               # 화면, 서비스, 프런트엔드 모델
│     ├─ assets/            # 이미지·번역 등 정적 리소스
│     └─ hacking-instructor/ # 실습 안내 기능
├─ ftp/                     # 파일 열람·다운로드 관련 실습 자료
├─ i18n/                    # 서버 번역 파일용 디렉터리
├─ infrastructure/          # 취약한 인프라 설정을 다루는 실습 자료
├─ lib/                     # 서버 공통 기능, 인증·과제 관련 로직
│  └─ startup/              # 초기화 및 의존성·설정 검증
├─ models/                  # Sequelize 모델 및 관계 정의
├─ routes/                  # 로그인·검색·주문 등 API 처리
├─ uploads/                 # 업로드 파일 저장 영역
├─ views/                   # 서버 렌더링용 HBS·Pug 템플릿
├─ app.ts                   # 서버 실행 진입점
├─ server.ts                # Express 설정, API 등록 및 서버 시작
├─ package.json             # 서버 의존성과 빌드·실행 명령
├─ tsconfig.json            # 서버 TypeScript 컴파일 설정
├─ Dockerfile               # 이 문서에서 사용하는 이미지 빌드 설정
├─ .dockerignore            # Docker 빌드 대상에서 제외할 경로
├─ .gitignore               # Git 추적 제외 설정
├─ .npmrc                   # npm 설치 설정
├─ swagger.yml              # 서버가 읽는 API 문서 정의
├─ ctf.key                  # CTF 관련 기능에서 사용하는 키
├─ LICENSE                  # 원본 프로젝트 라이선스
├─ README.md                # 현재 실행 안내
├─ REVIEW.md                # 장바구니 조회 API를 읽는 순서와 학습 안내
├─ HANDOFF.md               # 새 PC에서 이어가는 방법과 다음 작업
├─ REFERENCES.md            # 원본 관련 참고 자료
├─ SECURITY.md              # 원본 보안 정책·신고 안내
├─ SOLUTIONS.md             # 원본 실습 풀이 관련 자료
└─ threat-model.json        # 위협 모델 자료
```

`infrastructure/`, `ftp/`, `encryptionkeys/`, `.well-known/`, `data/static/`은 보안 실습 기능과 연결되어 있으므로 유지합니다. `infrastructure/` 내부의 배포 파일은 취약점 실습 자료입니다. 실행에는 **프로젝트 루트의 Dockerfile**을 사용합니다.

현재 폴더에는 `test/`, `rsn/`, `scripts/`, `.github/`, AI 도구 설정 등의 개발·관리 디렉터리가 없습니다. `package.json`에는 이들을 참조하는 기존 테스트·검사·패키징 명령이 일부 남아 있으므로, 이 문서의 Docker 실행 절차를 사용합니다.

## 2. 실행 전 준비

- Docker Desktop을 실행하고 Linux 컨테이너 엔진이 준비될 때까지 기다립니다.
- PowerShell을 엽니다.
- 최초 빌드에는 이미지·의존성 다운로드를 위한 인터넷 연결이 필요합니다.
- 호스트의 `3000` 포트를 다른 프로그램이 사용하고 있지 않아야 합니다.

Docker 엔진 연결을 확인합니다.

```powershell
docker info --format '{{.ServerVersion}}'
```

서버 버전이 출력되면 엔진에 연결된 상태입니다. 이 방식은 컨테이너 안의 Node.js 24를 사용하므로, PC에 Node.js나 npm을 별도로 설치하지 않아도 됩니다.

## 3. 이미지 빌드

프로젝트 폴더에서 실행합니다. 마지막의 `.`은 현재 폴더를 빌드 대상으로 지정합니다.

```powershell
# 복제한 폴더로 이동합니다. 현재 위치에 맞게 경로를 변경하세요.
cd mini-juice-shop
docker build -t mini-juice-shop .
```

Dockerfile이 의존성을 설치하고 프런트엔드와 서버 빌드를 수행한 뒤 실행 이미지를 만듭니다. 빌드 결과는 컨테이너 이미지 안에 생성되며, 호스트 폴더에 `build/`나 `frontend/dist/`가 생길 필요는 없습니다.

빌드가 성공한 뒤 이미지가 있는지 확인합니다.

```powershell
docker image ls mini-juice-shop
```

`mini-juice-shop` 저장소와 `latest` 태그가 표시되어야 합니다. 같은 이름의 이전 이미지가 있을 수 있으므로, 이미지 목록뿐 아니라 직전 빌드의 성공 여부도 확인합니다.

## 4. 서버 실행

```powershell
docker run --rm --name mini-juice-shop -p 127.0.0.1:3000:3000 mini-juice-shop
```

| 옵션 | 의미 |
|---|---|
| `--rm` | 종료 시 해당 컨테이너를 자동으로 제거 |
| `--name mini-juice-shop` | 상태·로그 조회에 사용할 컨테이너 이름 |
| `-p 127.0.0.1:3000:3000` | PC의 로컬 3000 포트를 컨테이너의 3000 포트와 연결 |

실행 터미널은 열린 상태로 둡니다. 초기화 후 다음 로그가 표시되는지 확인합니다.

```text
Server listening on port 3000
```

## 5. 웹 접속 및 동작 확인

브라우저에서 다음 주소를 엽니다.

**[http://localhost:3000](http://localhost:3000)**

상품 목록이 표시되고 검색·메뉴 등 화면이 정상적으로 동작하는지 확인합니다.

별도 PowerShell 창에서 컨테이너와 HTTP 응답도 확인할 수 있습니다.

```powershell
docker ps --filter name=mini-juice-shop
docker logs --tail 50 mini-juice-shop
(Invoke-WebRequest -Uri 'http://localhost:3000/' -TimeoutSec 10).StatusCode
```

- `docker ps`: 컨테이너가 `Up` 상태이고 `127.0.0.1:3000->3000/tcp` 연결이 표시됩니다.
- `docker logs`: 서버 시작 메시지와 오류 유무를 확인합니다.
- HTTP 확인 명령: 정상 응답이면 `200`이 출력됩니다. 화면·API 기능의 정상 여부는 브라우저에서도 확인합니다.

문서 작성 시 실행 중인 `mini-juice-shop` 컨테이너의 포트 연결과 루트 URL의 HTTP `200` 응답을 확인했습니다. 문서 작성 과정에서 별도 재빌드나 컨테이너 재시작은 수행하지 않았습니다.

## 6. 종료와 다음 실행

서버를 실행한 터미널에서 `Ctrl+C`를 누릅니다. 다른 터미널에서 종료하려면 다음 명령을 사용합니다.

```powershell
docker stop mini-juice-shop
```

`--rm`으로 실행했으므로 종료된 컨테이너는 제거되고 이미지는 남습니다. 볼륨을 연결하지 않았으므로 컨테이너 내부에서 변경된 파일·DB는 다음 컨테이너로 보존되지 않습니다.

다음 실행에서는 이미지를 다시 빌드하지 않고 아래 명령만 실행하면 됩니다.

```powershell
docker run --rm --name mini-juice-shop -p 127.0.0.1:3000:3000 mini-juice-shop
```

소스나 설정 파일을 변경했다면 기존 컨테이너를 종료하고 이미지를 다시 빌드한 뒤 실행합니다.

## 7. 실행이 안 될 때

| 증상 | 확인 및 조치 |
|---|---|
| Docker 엔진에 연결할 수 없음 | Docker Desktop의 Linux 컨테이너 엔진 상태를 확인하고 `docker info` 재실행 |
| 이미지 다운로드·npm 설치 단계에서 빌드 실패 | 빌드 로그의 첫 오류와 네트워크·프록시 설정 확인 |
| `mini-juice-shop` 이름이 이미 사용 중 | `docker ps -a --filter name=mini-juice-shop`으로 기존 컨테이너 확인 |
| `3000` 포트 사용 중 | 기존 서비스를 확인하거나 아래의 `3001` 포트 실행 사용 |
| 브라우저 접속 실패 | 시작 로그, 컨테이너 상태, 실행 시 지정한 호스트 포트 확인 |

기존 컨테이너를 종료하려는 경우에만 `docker stop mini-juice-shop`을 실행합니다. 자동 제거되지 않은 중지 컨테이너가 남아 있으면 해당 컨테이너의 필요 여부를 확인한 뒤 `docker rm mini-juice-shop`으로 제거할 수 있습니다.

호스트 포트를 `3001`로 바꾸려면 컨테이너의 `3000` 포트는 그대로 두고 실행합니다.

```powershell
docker run --rm --name mini-juice-shop -p 127.0.0.1:3001:3000 mini-juice-shop
```

이 경우 브라우저 주소와 HTTP 확인 주소도 `http://localhost:3001`로 변경합니다.

## 8. 코드 이해와 리뷰 시작하기

웹이 정상적으로 실행되는 것을 확인했다면, **[REVIEW.md](REVIEW.md)를 보면서 코드 이해를 순서대로 따라갑니다.**

대상 API는 `GET /rest/basket/:id`입니다. API 등록 → 로그인 정보 → 인증 미들웨어 → 데이터 모델 → 실제 조회 함수 → 보조 함수 → 프런트엔드 요청 순서로 읽습니다. 관련 코드의 한국어 학습 주석과 REVIEW.md의 확인 질문을 함께 활용합니다.

다른 PC에서 작업을 이어가거나 다음 개발 단계를 확인하려면 **[HANDOFF.md](HANDOFF.md)**를 먼저 읽습니다.
