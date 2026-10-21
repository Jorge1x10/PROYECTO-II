// Cifrado de contraseñas, tokens de sesión y códigos de recuperación.
// Todo usa el módulo crypto de Node: no se guarda nunca una contraseña en claro.
import { createHash, pbkdf2, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const derivar = promisify(pbkdf2)

export const ITERACIONES = 120_000
const LONGITUD_HASH = 32

export async function cifrar(password, iteraciones = ITERACIONES) {
  const sal = randomBytes(16)
  const hash = await derivar(password, sal, iteraciones, LONGITUD_HASH, 'sha256')
  return {
    sal: sal.toString('base64'),
    hash: hash.toString('base64'),
    iteraciones,
  }
}

export async function verificar(password, registro) {
  const calculado = await derivar(
    password,
    Buffer.from(registro.sal, 'base64'),
    registro.iteraciones,
    LONGITUD_HASH,
    'sha256',
  )
  const esperado = Buffer.from(registro.hash, 'base64')
  return calculado.length === esperado.length && timingSafeEqual(calculado, esperado)
}

// Gasta el mismo tiempo que una verificación real cuando el correo no existe,
// para que el tiempo de respuesta no revele qué correos están registrados.
export async function verificacionFalsa(password, iteraciones = ITERACIONES) {
  await derivar(password, 'sal-de-relleno', iteraciones, LONGITUD_HASH, 'sha256')
  return false
}

export function nuevoToken() {
  return randomBytes(32).toString('base64url')
}

// En la base de datos solo se guarda la huella del token, nunca el token.
export function huella(texto) {
  return createHash('sha256').update(texto).digest('hex')
}

export function nuevoCodigo() {
  return String(randomInt(0, 1_000_000)).padStart(6, '0')
}
