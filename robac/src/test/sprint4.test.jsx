import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from '../App'

async function entrar(user, correo, password) {
  await user.type(screen.getByLabelText('Correo'), correo)
  await user.type(screen.getByLabelText('Contraseña'), password)
  await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
}

describe('Sprint 4 · sesión con el servidor', () => {
  it('la sesión sigue abierta al recargar la página', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<App />)
    await entrar(user, 'residente@robac.mx', 'residente123')
    expect(await screen.findByText('Hola, Rosa Residente')).toBeInTheDocument()
    unmount()

    window.location.hash = '#/'
    render(<App />)
    expect(await screen.findByText('Hola, Rosa Residente')).toBeInTheDocument()
  })

  it('si el servidor ya no reconoce la sesión, manda a iniciar sesión', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<App />)
    await entrar(user, 'residente@robac.mx', 'residente123')
    await screen.findByText('Hola, Rosa Residente')
    unmount()

    globalThis.servidorDePrueba.db.exec('DELETE FROM sesiones')
    window.location.hash = '#/'
    render(<App />)
    expect(await screen.findByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(localStorage.getItem('robac-token')).toBeNull()
  })

  it('un usuario desactivado mientras tiene sesión pierde el acceso', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<App />)
    await entrar(user, 'residente@robac.mx', 'residente123')
    await screen.findByText('Hola, Rosa Residente')
    unmount()

    globalThis.servidorDePrueba.db.exec("UPDATE usuarios SET activo = 0 WHERE id = 'u3'")
    window.location.hash = '#/'
    render(<App />)
    expect(await screen.findByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument()
  })

  it('las visitas autorizadas quedan guardadas en la base de datos', async () => {
    const user = userEvent.setup()
    render(<App />)
    await entrar(user, 'residente@robac.mx', 'residente123')
    await user.click(await screen.findByText('Visitas'))
    await user.type(await screen.findByLabelText('Nombre del visitante'), 'Pedro Pérez')
    await user.click(screen.getByRole('button', { name: 'Autorizar visita' }))
    expect(await screen.findByText('Pedro Pérez')).toBeInTheDocument()

    const filas = globalThis.servidorDePrueba.db.prepare('SELECT visitante, estado FROM visitas').all()
    expect(filas).toHaveLength(1)
    expect(filas[0]).toMatchObject({ visitante: 'Pedro Pérez', estado: 'autorizada' })
  })
})

describe('Sprint 4 · recuperación de contraseña', () => {
  async function pedirCodigo(user, correo) {
    await user.click(screen.getByText('¿Olvidaste tu contraseña?'))
    await user.type(await screen.findByLabelText('Correo'), correo)
    await user.click(screen.getByRole('button', { name: 'Enviar código' }))
    expect(await screen.findByRole('status')).toHaveTextContent('código de 6 dígitos')
  }

  it('recupera la contraseña con el código y ya se puede entrar con la nueva', async () => {
    const user = userEvent.setup()
    render(<App />)
    await pedirCodigo(user, 'residente@robac.mx')

    const { codigo } = globalThis.servidorDePrueba.codigos[0]
    await user.type(screen.getByLabelText('Código de 6 dígitos'), codigo)
    await user.type(screen.getByLabelText('Nueva contraseña'), 'recuperada1')
    await user.type(screen.getByLabelText('Confirmar nueva contraseña'), 'recuperada1')
    await user.click(screen.getByRole('button', { name: 'Guardar nueva contraseña' }))
    expect(await screen.findByText(/se actualizó/)).toBeInTheDocument()

    await user.click(screen.getByText('Volver a iniciar sesión'))
    await entrar(user, 'residente@robac.mx', 'recuperada1')
    expect(await screen.findByText('Hola, Rosa Residente')).toBeInTheDocument()
  })

  it('un código incorrecto muestra un error y no cambia la contraseña', async () => {
    const user = userEvent.setup()
    render(<App />)
    await pedirCodigo(user, 'residente@robac.mx')

    const { codigo } = globalThis.servidorDePrueba.codigos[0]
    const incorrecto = codigo === '000000' ? '111111' : '000000'
    await user.type(screen.getByLabelText('Código de 6 dígitos'), incorrecto)
    await user.type(screen.getByLabelText('Nueva contraseña'), 'recuperada1')
    await user.type(screen.getByLabelText('Confirmar nueva contraseña'), 'recuperada1')
    await user.click(screen.getByRole('button', { name: 'Guardar nueva contraseña' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('no es válido o ya venció')

    await user.click(screen.getByText('Volver a iniciar sesión'))
    await entrar(user, 'residente@robac.mx', 'residente123')
    expect(await screen.findByText('Hola, Rosa Residente')).toBeInTheDocument()
  })

  it('un correo desconocido recibe el mismo aviso y no se envía ningún código', async () => {
    const user = userEvent.setup()
    render(<App />)
    await pedirCodigo(user, 'nadie@robac.mx')
    expect(globalThis.servidorDePrueba.codigos).toHaveLength(0)
  })

  it('exige que la confirmación coincida con la nueva contraseña', async () => {
    const user = userEvent.setup()
    render(<App />)
    await pedirCodigo(user, 'residente@robac.mx')

    const { codigo } = globalThis.servidorDePrueba.codigos[0]
    await user.type(screen.getByLabelText('Código de 6 dígitos'), codigo)
    await user.type(screen.getByLabelText('Nueva contraseña'), 'recuperada1')
    await user.type(screen.getByLabelText('Confirmar nueva contraseña'), 'distinta22')
    await user.click(screen.getByRole('button', { name: 'Guardar nueva contraseña' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('no coincide')
  })
})
