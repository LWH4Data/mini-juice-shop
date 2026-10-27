/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import fs from 'node:fs'
import crypto from 'node:crypto'
import { type Request, type Response, type NextFunction } from 'express'
import { type UserModel } from '@juice-shop/models/user'
import expressJwt from 'express-jwt'
import jwt from 'jsonwebtoken'
import jws from 'jws'
import sanitizeHtmlLib from 'sanitize-html'
import sanitizeFilenameLib from 'sanitize-filename'
import * as utils from './utils'

// @ts-expect-error FIXME no typescript definitions for z85 :(
import * as z85 from 'z85'

export const publicKey = fs ? fs.readFileSync('encryptionkeys/jwt.pub', 'utf8') : 'placeholder-public-key'
const privateKey = '-----BEGIN RSA PRIVATE KEY-----\r\nMIICXAIBAAKBgQDNwqLEe9wgTXCbC7+RPdDbBbeqjdbs4kOPOIGzqLpXvJXlxxW8iMz0EaM4BKUqYsIa+ndv3NAn2RxCd5ubVdJJcX43zO6Ko0TFEZx/65gY3BE0O6syCEmUP4qbSd6exou/F+WTISzbQ5FBVPVmhnYhG/kpwt/cIxK5iUn5hm+4tQIDAQABAoGBAI+8xiPoOrA+KMnG/T4jJsG6TsHQcDHvJi7o1IKC/hnIXha0atTX5AUkRRce95qSfvKFweXdJXSQ0JMGJyfuXgU6dI0TcseFRfewXAa/ssxAC+iUVR6KUMh1PE2wXLitfeI6JLvVtrBYswm2I7CtY0q8n5AGimHWVXJPLfGV7m0BAkEA+fqFt2LXbLtyg6wZyxMA/cnmt5Nt3U2dAu77MzFJvibANUNHE4HPLZxjGNXN+a6m0K6TD4kDdh5HfUYLWWRBYQJBANK3carmulBwqzcDBjsJ0YrIONBpCAsXxk8idXb8jL9aNIg15Wumm2enqqObahDHB5jnGOLmbasizvSVqypfM9UCQCQl8xIqy+YgURXzXCN+kwUgHinrutZms87Jyi+D8Br8NY0+Nlf+zHvXAomD2W5CsEK7C+8SLBr3k/TsnRWHJuECQHFE9RA2OP8WoaLPuGCyFXaxzICThSRZYluVnWkZtxsBhW2W8z1b8PvWUE7kMy7TnkzeJS2LSnaNHoyxi7IaPQUCQCwWU4U+v4lD7uYBw00Ga/xt+7+UqFPlPVdz1yyr4q24Zxaw0LgmuEvgU5dycq8N7JxjTubX0MIRR+G9fmDBBl8=\r\n-----END RSA PRIVATE KEY-----'

// 장바구니 읽기 3: interface는 객체의 형태를 설명하는 TypeScript 타입입니다.
// 이 선언은 실행 시 사용자 객체를 만들거나 값을 검증하지 않습니다. 컴파일 뒤에는 타입 정보가 사라집니다.
// status?: string처럼 물음표가 붙은 속성은 생략 가능하고, data: UserModel은 필수 속성입니다.
interface ResponseWithUser {
  status?: string
  data: UserModel
  iat?: number
  exp?: number
  bid?: number
}

// Record<string, T>는 문자열 키로 T 타입의 값을 찾는 객체 형태입니다.
// 함수 타입의 => 오른쪽은 반환 타입이고, void는 호출자가 쓸 반환값이 없다는 뜻입니다.
// A | undefined는 A 값 또는 값 없음 중 하나라는 유니언 타입입니다. any는 타입 검사를 느슨하게 합니다.
interface IAuthenticatedUsers {
  tokenMap: Record<string, ResponseWithUser>
  idMap: Record<string, string>
  put: (token: string, user: ResponseWithUser) => void
  get: (token?: string) => ResponseWithUser | undefined
  tokenOf: (user: UserModel) => string | undefined
  from: (req: Request) => ResponseWithUser | undefined
  updateFrom: (req: Request, user: ResponseWithUser) => any
}

export const hash = (data: string) => crypto.createHash('md5').update(data).digest('hex')
export const hmac = (data: string) => crypto.createHmac('sha256', 'pa4qacea4VK9t9nGv7yZtwmj').update(data).digest('hex')

export const cutOffPoisonNullByte = (str: string) => {
  const nullByte = '%00'
  if (str.includes(nullByte)) {
    return str.substring(0, str.indexOf(nullByte))
  }
  return str
}

// export는 다른 파일이 import해서 사용할 수 있게 합니다. () => ...는 화살표 함수입니다.
// 여기서는 공개 키를 설정한 JWT 인증 미들웨어를 만들어 반환합니다. 객체 소유권 검사는 별도입니다.
// as any는 컴파일러에 타입을 느슨하게 취급하도록 알릴 뿐, 실행 중 데이터를 변환하거나 검증하지 않습니다.
export const isAuthorized = () => expressJwt(({ secret: publicKey }) as any)

export const denyAll = () => expressJwt({ secret: '' + Math.random() } as any)

// user = {}는 인자를 생략하면 빈 객체를 쓰는 기본값입니다. 여기서는 사용자 정보에 서명해 JWT를 발급합니다.
export const authorize = (user = {}) => jwt.sign(user, privateKey, { expiresIn: '6h', algorithm: 'RS256' })

export const verify = (token: string) => token ? (jws.verify as ((token: string, secret: string) => boolean))(token, publicKey) : false
export const decode = (token: string) => { return jws.decode(token)?.payload }

export const sanitizeHtml = (html: string) => sanitizeHtmlLib(html)
export const sanitizeLegacy = (input = '') => input.replace(/<(?:\w+)\W+?[\w]/gi, '')
export const sanitizeFilename = (filename: string) => sanitizeFilenameLib(filename)
export const sanitizeSecure = (html: string): string => {
  const sanitized = sanitizeHtml(html)
  if (sanitized === html) {
    return html
  } else {
    return sanitizeSecure(sanitized)
  }
}

// 토큰과 사용자 정보를 연결하는 서버 메모리의 객체입니다. DB 테이블은 아니며 프로세스가 끝나면 사라집니다.
// 변수명: 타입 = 값 형태로 객체가 따라야 할 인터페이스를 지정합니다.
export const authenticatedUsers: IAuthenticatedUsers = {
  tokenMap: {},
  idMap: {},

  // 대괄호 접근 tokenMap[token]은 token 문자열을 키로 씁니다. this는 이 메서드를 호출한 객체를 가리킵니다.
  put: function (token: string, user: ResponseWithUser) {
    this.tokenMap[token] = user
    this.idMap[user.data.id] = token
  },

  // token?: string은 생략 가능한 매개변수입니다. 조건 ? 참일 때 값 : 거짓일 때 값은 삼항 연산자입니다.
  get: function (token?: string) {
    return token ? this.tokenMap[utils.unquote(token)] : undefined
  },

  tokenOf: function (user: UserModel) {
    return user ? this.idMap[user.id] : undefined
  },

  // 요청의 Authorization 헤더에서 토큰을 꺼낸 다음, 메모리에 저장된 사용자 정보를 찾습니다.
  from: function (req: Request) {
    const token = utils.jwtFrom(req)
    return token ? this.get(token) : undefined
  },

  updateFrom: function (req: Request, user: ResponseWithUser) {
    const token = utils.jwtFrom(req)
    this.put(token, user)
  }
}

export const userEmailFrom = ({ headers }: any) => {
  return headers ? headers['x-user-email'] : undefined
}

export const generateCoupon = (discount: number, date = new Date()) => {
  const coupon = utils.toMMMYY(date) + '-' + discount
  return z85.encode(coupon)
}

export const discountFromCoupon = (coupon?: string) => {
  if (!coupon) {
    return undefined
  }
  const decoded = z85.decode(coupon)
  if (decoded && (hasValidFormat(decoded.toString()) != null)) {
    const parts = decoded.toString().split('-')
    const validity = parts[0]
    if (utils.toMMMYY(new Date()) === validity) {
      const discount = parts[1]
      return parseInt(discount)
    }
  }
}

function hasValidFormat (coupon: string) {
  return coupon.match(/(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[0-9]{2}-[0-9]{2}/)
}

// vuln-code-snippet start redirectCryptoCurrencyChallenge redirectChallenge
export const redirectAllowlist = new Set([
  'https://github.com/juice-shop/juice-shop',
  'https://blockchain.info/address/1AbKfgvw9psQ41NbLi8kufDQTezwG8DRZm', // vuln-code-snippet vuln-line redirectCryptoCurrencyChallenge
  'https://explorer.dash.org/address/Xr556RzuwX6hg5EGpkybbv5RanJoZN17kW', // vuln-code-snippet vuln-line redirectCryptoCurrencyChallenge
  'https://etherscan.io/address/0x0f933ab9fcaaa782d0279c300d73750e1311eae6', // vuln-code-snippet vuln-line redirectCryptoCurrencyChallenge
  'http://shop.spreadshirt.com/juiceshop',
  'http://shop.spreadshirt.de/juiceshop',
  'https://www.stickeryou.com/products/owasp-juice-shop/794',
  'http://leanpub.com/juice-shop'
])

export const isRedirectAllowed = (url: string) => {
  let allowed = false
  for (const allowedUrl of redirectAllowlist) {
    allowed = allowed || url.includes(allowedUrl) // vuln-code-snippet vuln-line redirectChallenge
  }
  return allowed
}
// vuln-code-snippet end redirectCryptoCurrencyChallenge redirectChallenge

export const roles = {
  customer: 'customer',
  deluxe: 'deluxe',
  accounting: 'accounting',
  admin: 'admin'
}

export const deluxeToken = (email: string) => {
  const hmac = crypto.createHmac('sha256', privateKey)
  return hmac.update(email + roles.deluxe).digest('hex')
}

export const isAccounting = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    const decodedToken = verify(utils.jwtFrom(req)) && decode(utils.jwtFrom(req))
    if (decodedToken?.data?.role === roles.accounting) {
      next()
    } else {
      res.status(403).json({ error: 'Malicious activity detected' })
    }
  }
}

export const isDeluxe = (req: Request) => {
  const decodedToken = verify(utils.jwtFrom(req)) && decode(utils.jwtFrom(req))
  return decodedToken?.data?.role === roles.deluxe && decodedToken?.data?.deluxeToken && decodedToken?.data?.deluxeToken === deluxeToken(decodedToken?.data?.email)
}

export const isCustomer = (req: Request) => {
  const decodedToken = verify(utils.jwtFrom(req)) && decode(utils.jwtFrom(req))
  return decodedToken?.data?.role === roles.customer
}

// 바깥 함수는 미들웨어를 만들고, 반환된 안쪽 함수는 실제 요청마다 실행됩니다.
// req는 요청, res는 응답, next는 다음 미들웨어나 오류 처리기로 넘기는 함수입니다.
export const appendUserId = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {

      // 요청 본문의 UserId를 서버가 토큰에서 찾은 사용자 ID로 설정합니다.
      // 이 값은 장바구니 ID(req.params.id)가 아니며, 설정만으로 DB 조회 조건에 자동 반영되지는 않습니다.
      req.body.UserId = authenticatedUsers.tokenMap[utils.jwtFrom(req)].data.id
      next()
    } catch (error: unknown) {

      // try 안에서 예외가 발생하면 catch로 이동합니다. unknown은 사용 전에 타입 확인이 필요한 값입니다.
      // 여기서는 상태 코드 401과 오류 JSON으로 응답하고 next()를 호출하지 않습니다.
      res.status(401).json({ status: 'error', message: utils.getErrorMessage(error) })
    }
  }
}

// 화살표 함수가 다른 화살표 함수를 반환하는 축약 문법입니다.
// 쿠키 또는 헤더의 토큰이 메모리에 없으면 JWT를 검증하고 사용자 정보를 다시 저장합니다.
export const updateAuthenticatedUsers = () => (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies.token || utils.jwtFrom(req)
  if (token && authenticatedUsers.get(token) === undefined) {

    // 세 번째 인자는 검증 결과를 받는 콜백 함수입니다. err가 null이면 오류가 없다는 뜻입니다.
    // 이 함수 자체는 async가 아니며 await도 없습니다. 코드 아래의 next() 호출 위치도 함께 확인하세요.
    jwt.verify(token, publicKey, (err: Error | null, decoded: any) => {

      // ===와 !==는 타입을 강제로 바꾸지 않고 비교합니다. &&는 왼쪽이 참인 경우에만 오른쪽을 평가합니다.
      // decoded?.data의 ?.는 decoded가 null/undefined이면 속성 접근 대신 undefined를 반환합니다.
      if (err === null && decoded?.data !== undefined) {
        authenticatedUsers.put(token, decoded)
        res.cookie('token', token)
      }
    })
  }
  next()
}
