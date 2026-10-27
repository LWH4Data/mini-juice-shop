/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import {
  Model,
  type InferAttributes,
  type InferCreationAttributes,
  DataTypes,
  type CreationOptional,
  type NonAttribute,
  type Sequelize
} from 'sequelize'
import { type ProductModel } from './product'

// 장바구니 읽기 4: class는 객체의 설계도이고 extends는 Sequelize의 Model 기능을 상속받습니다.
// <...>는 제네릭 타입 인자입니다. InferAttributes와 InferCreationAttributes는 속성·생성 입력 타입을 추론합니다.
class Basket extends Model<
InferAttributes<Basket>,
InferCreationAttributes<Basket>
> {

  // declare는 실행 코드를 만드는 대신 속성 타입을 선언합니다. 실제 DB 속성은 아래 Basket.init()에서 정의합니다.
  // CreationOptional<number>는 생성 입력에서 생략 가능한 숫자 타입입니다. 소유권 검사나 DB 자동 할당을 뜻하지 않습니다.
  declare UserId: CreationOptional<number>
  declare id: CreationOptional<number>

  // string | null은 문자열 또는 null을 허용합니다. null은 비어 있음을 명시적으로 나타내는 값입니다.
  declare coupon: CreationOptional<string> | null

  // ?는 속성이 없을 수도 있다는 뜻이고, ProductModel[]는 상품 객체의 배열입니다.
  // NonAttribute는 장바구니 자체의 DB 컬럼이 아닌 연관 조회 결과임을 타입에 표시합니다.
  declare Products?: NonAttribute<ProductModel[]>
}

// TypeScript 타입과 별개로, 실제 테이블 컬럼·자료형을 Sequelize에 등록하는 초기화 함수입니다.
const BasketModelInit = (sequelize: Sequelize) => {
  Basket.init(
    {

      // id는 정수 기본 키이며 자동 증가합니다. UserId는 이 장바구니 소유 사용자의 ID입니다.
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      coupon: DataTypes.STRING,
      UserId: {
        type: DataTypes.INTEGER
      }
    },
    {
      tableName: 'Baskets',
      sequelize
    }
  )
}

// as는 여기서 내보낼 이름을 바꾸는 별칭 문법입니다. 다른 파일에서는 BasketModel이라는 이름으로 가져옵니다.
export { Basket as BasketModel, BasketModelInit }
