/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import packageJson from '../package.json'
import fs from 'node:fs'
import logger from './logger'
import config from 'config'
import download from 'download'
import { ProxyAgent } from 'proxy-agent'
import crypto from 'node:crypto'
import clarinet from 'clarinet'
import type { Challenge } from '@juice-shop/data/types'

import isHeroku from './is-heroku'
import isDocker from './is-docker'
import isWindows from './is-windows'
export { default as isDocker } from './is-docker'
export { default as isWindows } from './is-windows'

const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
const proxyAgent = new ProxyAgent()

// <T>는 입력 데이터 타입을 그대로 출력의 data 타입으로 연결하는 제네릭입니다.
// 아래 ): { data: T, status: string }은 반환 객체의 타입이고, status 기본값은 success입니다.
// 이 함수는 포장만 수행합니다. 데이터 필터링이나 접근 권한 검사는 하지 않습니다.
export const queryResultToJson = <T>(
  data: T,
  status: string = 'success'
): { data: T, status: string } => {
  return {
    status,
    data
  }
}

export const isUrl = (url: string) => {
  return url.startsWith('http')
}

export const containsEscaped = function (str: string, element: string) {
  return str ? str.includes(element.replace(/"/g, '\\"')) : false
}

export const containsOrEscaped = function (str: string, element: string) {
  return (str ? str.includes(element) : false) || containsEscaped(str, element)
}

export const unquote = function (str: string) {
  if (str && str.startsWith('"') && str.endsWith('"')) {
    return str.substring(1, str.length - 1)
  } else {
    return str
  }
}

export const trunc = function (str: string, length: number) {
  str = str.replace(/(\r\n|\n|\r)/gm, '')
  return (str.length > length) ? str.substr(0, length - 1) + '...' : str
}

export const version = (module?: string) => {
  if (module) {
    // @ts-expect-error FIXME Ignoring any type issue on purpose
    return packageJson.dependencies[module]
  } else {
    return packageJson.version
  }
}

let cachedCtfKey: string | undefined
const getCtfKey = () => {
  if (!cachedCtfKey) {
    if (process.env.CTF_KEY !== undefined && process.env.CTF_KEY !== '') {
      cachedCtfKey = process.env.CTF_KEY
    } else {
      const data = fs.readFileSync('ctf.key', 'utf8')
      cachedCtfKey = data
    }
  }
  return cachedCtfKey
}
export const ctfFlag = (text: string) => {
  return crypto.createHmac('sha1', getCtfKey()).update(text).digest('hex')
}

export const toMMMYY = (date: Date) => {
  const month = date.getMonth()
  const year = date.getFullYear()
  return months[month] + year.toString().substring(2, 4)
}

export const toISO8601 = (date: Date) => {
  let day = '' + date.getDate()
  let month = '' + (date.getMonth() + 1)
  const year = date.getFullYear()

  if (month.length < 2) month = '0' + month
  if (day.length < 2) day = '0' + day

  return [year, month, day].join('-')
}

export const extractFilename = (url: string) => {
  let file = decodeURIComponent(url.substring(url.lastIndexOf('/') + 1))
  if (file ? file.includes('?') : false) {
    file = file.substring(0, file.indexOf('?'))
  }
  return file
}

export const downloadToFile = async (
  url: string,
  dest: string,
  downloadData: (url: string, options: download.DownloadOptions) => Promise<Buffer> = download
) => {
  try {
    const data = await downloadData(url, { agent: proxyAgent })
    fs.writeFileSync(dest, data)
    return true
  } catch (err) {
    logger.warn('Failed to download ' + url + ' (' + getErrorMessage(err) + ')')
    return false
  }
}

// 매개변수의 { headers }는 요청 객체에서 headers 속성만 꺼내는 객체 구조 분해입니다.
// 콜론 뒤 { headers: any }는 이 매개변수가 따를 타입입니다. 토큰 추출 자체는 JWT 검증과 다릅니다.
export const jwtFrom = ({ headers }: { headers: any }) => {
  if (headers?.authorization) {
    const parts = headers.authorization.split(' ')
    if (parts.length === 2) {
      const scheme = parts[0]
      const token = parts[1]

      // /^Bearer$/i는 전체 문자열이 Bearer인지 대소문자를 무시하고 검사하는 정규식입니다.
      if (/^Bearer$/i.test(scheme)) {
        return token
      }
    }
  }
  return undefined
}

export const randomHexString = (length: number): string => {
  return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length)
}

export interface ChallengeEnablementStatus {
  enabled: boolean
  disabledBecause: string | null
}

type SafetyModeSetting = 'enabled' | 'disabled' | 'auto'

type isEnvironmentFunction = () => boolean

export function getChallengeEnablementStatus (challenge: Challenge,
  safetyModeSetting: SafetyModeSetting = config.get<SafetyModeSetting>('challenges.safetyMode'),
  isEnvironmentFunctions: {
    isDocker: isEnvironmentFunction
    isHeroku: isEnvironmentFunction
    isWindows: isEnvironmentFunction
  } = { isDocker, isHeroku, isWindows }): ChallengeEnablementStatus {
  if (!challenge?.disabledEnv) {
    return { enabled: true, disabledBecause: null }
  }

  if (safetyModeSetting === 'disabled') {
    return { enabled: true, disabledBecause: null }
  }

  if (challenge.disabledEnv?.includes('Docker') && isEnvironmentFunctions.isDocker()) {
    return { enabled: false, disabledBecause: 'Docker' }
  }
  if (challenge.disabledEnv?.includes('Heroku') && isEnvironmentFunctions.isHeroku()) {
    return { enabled: false, disabledBecause: 'Heroku' }
  }
  if (challenge.disabledEnv?.includes('Windows') && isEnvironmentFunctions.isWindows()) {
    return { enabled: false, disabledBecause: 'Windows' }
  }
  if (challenge.disabledEnv && safetyModeSetting === 'enabled') {
    return { enabled: false, disabledBecause: 'Safety Mode' }
  }

  return { enabled: true, disabledBecause: null }
}
export function isChallengeEnabled (challenge: Challenge): boolean {
  const { enabled } = getChallengeEnablementStatus(challenge)
  return enabled
}

export const parseJsonCustom = (jsonString: string) => {
  const parser = clarinet.parser()
  const result: any[] = []
  parser.onkey = parser.onopenobject = (k: any) => {
    result.push({ key: k, value: null })
  }
  parser.onvalue = (v: any) => {
    result[result.length - 1].value = v
  }
  parser.write(jsonString)
  parser.close()
  return result
}

export const toSimpleIpAddress = (ipv6: string) => {
  if (ipv6?.startsWith('::ffff:')) {
    return ipv6.substr(7)
  } else if (ipv6 === '::1') {
    return '127.0.0.1'
  } else {
    return ipv6
  }
}

export const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message
  return String(error)
}

export const matchesSystemIniFile = (text: string) => {
  const match = text.match(/; for 16-bit app support/gi)
  return match !== null && match.length >= 1
}

export const matchesEtcPasswdFile = (text: string) => {
  const match = text.match(/(\w*:\w*:\d*:\d*:\w*:.*)|(Note that this file is consulted directly)/gi)
  return match !== null && match.length >= 1
}

export function diceCoefficient (s1: string, s2: string, n = 2): number {
  if (s1 === s2) return 1
  if (s1.length < n || s2.length < n) return 0

  const nGrams1 = new Map<string, number>()
  for (let i = 0; i <= s1.length - n; i++) {
    const nGram = s1.substring(i, i + n)
    nGrams1.set(nGram, (nGrams1.get(nGram) ?? 0) + 1)
  }

  let intersectionSize = 0
  for (let i = 0; i <= s2.length - n; i++) {
    const nGram = s2.substring(i, i + n)
    const count = nGrams1.get(nGram) ?? 0
    if (count > 0) {
      nGrams1.set(nGram, count - 1)
      intersectionSize++
    }
  }

  return (2.0 * intersectionSize) / (s1.length + s2.length - 2 * (n - 1))
}

/**
 * Wrapper for asynchronous Express route handlers to ensure any rejected promises are caught and passed to the next() function.
 * TODO: Revisit the need for this wrapper once the project is migrated to Express 5 which supports async handlers natively.
 */

// fn이라는 요청 처리 함수를 받아 새 처리 함수로 감싸는 고차 함수입니다.
// Promise.resolve()로 결과를 Promise로 다루고, 거절된 결과를 catch(next)로 오류 처리기에 전달합니다.
// 앞의 void는 Promise 결과를 여기서 사용하지 않음을 나타냅니다. 비동기 작업을 취소하지는 않습니다.
export const asyncHandler = (fn: (req: any, res: any, next: any) => Promise<any> | any) => (req: any, res: any, next: any) => {
  void Promise.resolve(fn(req, res, next)).catch(next)
}
