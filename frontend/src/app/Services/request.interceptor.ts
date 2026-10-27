/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import { type HttpEvent, type HttpHandler, type HttpInterceptor, type HttpRequest } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { type Observable } from 'rxjs'

// @Injectable()은 Angular가 의존성 주입에 사용할 수 있도록 클래스에 붙이는 데코레이터입니다.
@Injectable()
// implements는 이 클래스가 인터페이스의 약속을 따르는지 검사합니다. extends와 달리 구현을 상속하지 않습니다.
export class RequestInterceptor implements HttpInterceptor {

  // 콜론 뒤 Observable<HttpEvent<any>>는 반환 타입입니다. <any>는 제네릭 타입 인자입니다.
  // 브라우저 저장소 localStorage에서 토큰을 읽어 요청 헤더에 넣는 공통 처리입니다.
  intercept (req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (localStorage.getItem('token')) {

      // Angular의 요청 객체는 직접 수정하지 않고 clone()으로 변경 사항을 적용한 사본을 만듭니다.
      req = req.clone({
        setHeaders: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      })
    }

    if (localStorage.getItem('email')) {
      req = req.clone({
        setHeaders: {
          'X-User-Email': String(localStorage.getItem('email'))
        }
      })
    }

    // 여기서 next는 Express의 next() 함수가 아니라 Angular의 다음 요청 처리기입니다.
    // 수정한 요청을 다음 인터셉터 또는 실제 HTTP 전송 단계로 넘깁니다.
    return next.handle(req)
  }
}
