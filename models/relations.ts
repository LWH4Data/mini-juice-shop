import { type Sequelize } from 'sequelize'
import { AddressModel } from './address'
import { BasketModel } from './basket'
import { BasketItemModel } from './basketitem'
import { ChallengeModel } from './challenge'
import { ChallengeDependencyModel } from './challengeDependency'
import { CardModel } from './card'
import { ComplaintModel } from './complaint'
import { FeedbackModel } from './feedback'
import { HintModel } from './hint'
import { ImageCaptchaModel } from './imageCaptcha'
import { MemoryModel } from './memory'
import { PrivacyRequestModel } from './privacyRequests'
import { ProductModel } from './product'
import { QuantityModel } from './quantity'
import { RecycleModel } from './recycle'
import { SecurityAnswerModel } from './securityAnswer'
import { SecurityQuestionModel } from './securityQuestion'
import { UserModel } from './user'

import { WalletModel } from './wallet'
import { makeKeyNonUpdatable } from '../lib/noUpdate'

const relationsInit = (_sequelize: Sequelize) => {
  AddressModel.belongsTo(UserModel, {
    constraints: true,
    foreignKeyConstraint: true,
    foreignKey: {
      name: 'UserId'
    }
  })

  // 장바구니는 UserId를 외래 키로 사용해 한 사용자와 연결됩니다.
  // 외래 키 관계는 데이터 연결을 정의하며, API 요청자의 접근 권한을 자동으로 검사하지는 않습니다.
  BasketModel.belongsTo(UserModel, {
    constraints: true,
    foreignKeyConstraint: true,
    foreignKey: {
      name: 'UserId'
    }
  })

  // 장바구니와 상품은 BasketItem 중간 모델로 다대다 연결됩니다. through는 이 연결 모델을 지정합니다.
  // as: 'Products'는 연관 이름입니다. 조회 코드의 include에서도 같은 이름을 사용합니다.
  BasketModel.belongsToMany(ProductModel, {
    through: BasketItemModel,
    as: 'Products',
    foreignKey: {
      name: 'BasketId'
    }
  })
  makeKeyNonUpdatable(BasketItemModel, 'BasketId')

  CardModel.belongsTo(UserModel, {
    constraints: true,
    foreignKeyConstraint: true,
    foreignKey: {
      name: 'UserId'
    }
  })

  ComplaintModel.belongsTo(UserModel, {
    constraints: true,
    foreignKeyConstraint: true,
    foreignKey: {
      name: 'UserId'
    }
  })

  FeedbackModel.belongsTo(UserModel, {
    foreignKey: {
      name: 'UserId'
    }
  }) // no FK constraint to allow anonymous feedback posts

  ImageCaptchaModel.belongsTo(UserModel, {
    foreignKey: {
      name: 'UserId'
    }
  })

  MemoryModel.belongsTo(UserModel, {
    constraints: true,
    foreignKeyConstraint: true,
    foreignKey: {
      name: 'UserId'
    }
  })

  PrivacyRequestModel.belongsTo(UserModel, {
    constraints: true,
    foreignKeyConstraint: true,
    foreignKey: {
      name: 'UserId'
    }
  })

  ProductModel.belongsToMany(BasketModel, {
    through: BasketItemModel,
    foreignKey: {
      name: 'ProductId'
    }
  })
  makeKeyNonUpdatable(BasketItemModel, 'ProductId')

  QuantityModel.belongsTo(ProductModel, {
    constraints: true,
    foreignKeyConstraint: true,
    foreignKey: {
      name: 'ProductId'
    }
  })

  RecycleModel.belongsTo(UserModel, {
    constraints: true,
    foreignKeyConstraint: true,
    foreignKey: {
      name: 'UserId'
    }
  })
  RecycleModel.belongsTo(AddressModel, {
    constraints: true,
    foreignKeyConstraint: true,
    foreignKey: {
      name: 'AddressId'
    }
  })

  SecurityAnswerModel.belongsTo(UserModel, {
    foreignKey: {
      name: 'UserId'
    }
  })
  SecurityAnswerModel.belongsTo(SecurityQuestionModel, {
    constraints: true,
    foreignKeyConstraint: true,
    foreignKey: {
      name: 'SecurityQuestionId'
    }
  })

  WalletModel.belongsTo(UserModel, {
    constraints: true,
    foreignKeyConstraint: true,
    foreignKey: {
      name: 'UserId'
    }
  })

  ChallengeModel.hasMany(ChallengeDependencyModel)
  ChallengeDependencyModel.belongsTo(ChallengeModel)

  ChallengeModel.hasMany(HintModel)
  HintModel.belongsTo(ChallengeModel)
}

export { relationsInit }
