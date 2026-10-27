/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

// 장바구니 읽기 5: type으로 가져오는 이름은 요청·응답·다음 처리 함수의 타입이며 실행 코드에는 남지 않습니다.
import { type Request, type Response, type NextFunction } from 'express'

import { ProductModel } from '../models/product'
import { BasketModel } from '../models/basket'
import * as challengeUtils from '../lib/challengeUtils'

// import * as utils는 해당 파일이 내보내는 항목을 utils라는 이름 아래 모아 가져옵니다.
import * as utils from '../lib/utils'
import * as security from '../lib/insecurity'
import { challenges } from '../data/datacache'

// 이 함수는 장바구니 자체가 아니라 Express에 등록할 요청 처리 함수를 반환합니다.
export function retrieveBasket () {

  // async 함수는 Promise를 반환합니다. req: Request처럼 콜론 뒤 타입은 컴파일 시 검사에 사용됩니다.
  // await 중에는 이 함수의 후속 처리를 기다리며, 서버 전체를 멈추는 방식은 아닙니다.
  return async (req: Request, res: Response, next: NextFunction) => {
    try {

      // req.params는 URL 경로 매개변수입니다. /rest/basket/3이면 id에는 문자열 "3"이 들어옵니다.
      // const는 이 변수에 다른 값을 재대입하지 못하게 합니다. 객체 내용까지 불변으로 만들지는 않습니다.
      const id = req.params.id

      // findOne()은 조건에 맞는 장바구니 하나를 조회합니다. { id }는 { id: id }의 축약 문법입니다.
      // await로 DB 결과를 받은 뒤 진행합니다. 일치하는 장바구니가 없으면 결과는 null입니다.
      // include는 연결된 상품도 함께 조회합니다. paranoid: false는 상품의 소프트 삭제 필터를 해제합니다.
      // 코드 리뷰 포인트: where에 실제로 들어간 값과, 앞에서 설정한 req.body.UserId의 사용 여부를 비교하세요.
      const basket = await BasketModel.findOne({ where: { id }, include: [{ model: ProductModel, paranoid: false, as: 'Products' }] })

      /* jshint eqeqeq:false */
      // 아래 화살표 함수는 과제 달성 조건을 계산하는 콜백입니다. 접근을 허용·거부하는 미들웨어가 아닙니다.
      challengeUtils.solveIf(challenges.basketAccessChallenge, () => {
        const user = security.authenticatedUsers.from(req)

        // &&는 앞의 값이 falsy이면 평가를 멈추고 그 값을 돌려줍니다. 항상 boolean을 반환하는 문법은 아닙니다.
        // 여기서는 일부 문자열을 제외할 뿐이며, 이 조건만으로 ID가 엄격한 정수라고 검증되지는 않습니다.
        const isValidId = id && id !== 'undefined' && id !== 'null' && id !== 'NaN'

        // user.bid는 로그인 때 저장한 장바구니 ID입니다. parseInt(id, 10)은 문자열을 10진수 정수로 해석합니다.
        // !=는 필요하면 타입을 변환해 비교합니다. 이 return은 콜백의 결과이며 바깥 요청 처리를 종료하지 않습니다.
        return user && isValidId && user.bid && user?.bid != parseInt(id, 10) // eslint-disable-line eqeqeq
      })

      // basket?.Products로 null 접근을 피합니다. != null은 null과 undefined를 모두 제외합니다.
      // 이후 for문은 상품 배열을 순회하며 요청 언어에 맞게 이름을 바꿉니다. 여기서는 DB 저장을 호출하지 않습니다.
      if (((basket?.Products) != null) && basket.Products.length > 0) {
        for (let i = 0; i < basket.Products.length; i++) {
          basket.Products[i].name = req.__(basket.Products[i].name)
        }
      }

      // 조회 결과를 { status: "success", data: basket } 형태로 감싸 JSON 응답으로 보냅니다.
      // 이 함수에는 basket이 null일 때 별도의 404 응답을 보내는 분기가 없습니다.
      res.json(utils.queryResultToJson(basket))

    } catch (error) {

      // DB 조회 등에서 예외가 발생하면 next(error)로 Express의 오류 처리 미들웨어에 전달합니다.
      next(error)

    }
  }
}
