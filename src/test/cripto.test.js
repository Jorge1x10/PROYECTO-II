import { describe, expect, it } from 'vitest'
import { cifrarPassword, verificarPassword } from '../utils/passwords'

describe('Sprint 3 · cifrado de contraseñas', () => {
  it('cifra con sal aleatoria y verifica correctamente', async () => {
    const a = await cifrarPassword('clave123')
    const b = await cifrarPassword('clave123')
    expect(a.hash).not.toBe('clave123')
    expect(a.sal).not.toBe(b.sal)
    expect(a.hash).not.toBe(b.hash)
    expect(await verificarPassword('clave123', a)).toBe(true)
    expect(await verificarPassword('otra', a)).toBe(false)
  })
})
