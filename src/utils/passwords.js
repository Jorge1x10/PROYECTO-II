// Cifrado de contraseñas con PBKDF2 (Web Crypto, incluido en el navegador).
// Nunca se guarda la contraseña: se guarda una sal aleatoria y el resultado de derivarla.

const ITERACIONES = 120000

function aBase64(bytes) {
  return btoa(String.fromCharCode(...bytes))
}

function deBase64(texto) {
  return Uint8Array.from(atob(texto), (c) => c.charCodeAt(0))
}

async function derivar(password, sal, iteraciones) {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: sal, iterations: iteraciones },
    material,
    256,
  )
  return new Uint8Array(bits)
}

export async function cifrarPassword(password) {
  const sal = crypto.getRandomValues(new Uint8Array(16))
  const hash = await derivar(password, sal, ITERACIONES)
  return { sal: aBase64(sal), hash: aBase64(hash), iteraciones: ITERACIONES }
}

export async function verificarPassword(password, registro) {
  const hash = await derivar(password, deBase64(registro.sal), registro.iteraciones)
  return aBase64(hash) === registro.hash
}
